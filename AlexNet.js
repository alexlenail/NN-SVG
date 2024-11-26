
function AlexNet() {

    // /////////////////////////////////////////////////////////////////////////////
    //                       ///////    Variables    ///////
    // /////////////////////////////////////////////////////////////////////////////

    var w = window.innerWidth;
    var h = window.innerHeight;

    var color1 = '#eeeeee';
    var color2 = '#99ddff';
    var color3 = '#ffbbbb';

    var rectOpacity = 0.4;
    var filterOpacity = 0.4;
    var fontScale = 1;

    var line_material = new THREE.LineBasicMaterial( { 'color':0x000000 } );
    var box_material = new THREE.MeshBasicMaterial( {'color':color1, 'side':THREE.DoubleSide, 'transparent':true, 'opacity':rectOpacity, 'depthWrite':false, 'needsUpdate':true} );
    var conv_material = new THREE.MeshBasicMaterial( {'color':color2, 'side':THREE.DoubleSide, 'transparent':true, 'opacity':filterOpacity, 'depthWrite':false, 'needsUpdate':true} );
    var pyra_material = new THREE.MeshBasicMaterial( {'color':color3, 'side':THREE.DoubleSide, 'transparent':true, 'opacity':filterOpacity, 'depthWrite':false, 'needsUpdate':true} );

    var architecture = [];
    var architecture2 = [];
    var betweenLayers = 20;

    var logDepth = true;
    var depthScale = 10;
    var logWidth = true;
    var widthScale = 10;
    var logConvSize = false;
    var convScale = 1;

    var showDims = false;
    var showConvDims = false;

    let depthFn = (depth) => logDepth ? (Math.log(depth) * depthScale) : (depth * depthScale);
    let widthFn = (width) => logWidth ? (Math.log(width) * widthScale) : (width * widthScale);
    let convFn = (conv) => logConvSize ? (Math.log(conv) * convScale) : (conv * convScale);

    function wf(layer) { return widthFn(layer['width']); }
    function hf(layer) { return widthFn(layer['height']); }

    var layers = new THREE.Group();
    var convs = new THREE.Group();
    var pyramids = new THREE.Group();
    var sprites = new THREE.Group();


    var scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xffffff );

    // var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 100000 );
    var camera = new THREE.OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, -10000000, 10000000 );
    camera.position.set(-219, 92, 84);

    var renderer;
    var rendererType = 'webgl';

    var controls;


    // /////////////////////////////////////////////////////////////////////////////
    //                       ///////    Methods    ///////
    // /////////////////////////////////////////////////////////////////////////////

    function restartRenderer({rendererType_=rendererType}={}) {

        rendererType = rendererType_;

        clearThree(scene);

        if (rendererType === 'webgl') { renderer = new THREE.WebGLRenderer( { 'alpha':true } ); }
        else if (rendererType === 'svg') { renderer = new THREE.SVGRenderer(); }

        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.setSize( window.innerWidth, window.innerHeight );

        graph_container = document.getElementById('graph-container')
        while (graph_container.firstChild) { graph_container.removeChild(graph_container.firstChild); }
        graph_container.appendChild( renderer.domElement );

        if (controls) { controls.dispose(); }
        controls = new THREE.OrbitControls( camera, renderer.domElement );

        animate();

    }

    function animate() {
        requestAnimationFrame( animate );
        sprites.children.forEach(sprite => {
            sprite.quaternion.copy(camera.quaternion);
        });
        renderer.render(scene, camera);
    };

    restartRenderer();

    function redraw({architecture_=architecture,
                     architecture2_=architecture2,
                     betweenLayers_=betweenLayers,
                     logDepth_=logDepth,
                     depthScale_=depthScale,
                     logWidth_=logWidth,
                     widthScale_=widthScale,
                     logConvSize_=logConvSize,
                     convScale_=convScale,
                     showDims_=showDims,
                     showConvDims_=showConvDims}={}) {

        architecture = architecture_;
        architecture2 = architecture2_;
        betweenLayers = betweenLayers_;
        logDepth = logDepth_;
        depthScale = depthScale_;
        logWidth = logWidth_;
        widthScale = widthScale_;
        logConvSize = logConvSize_;
        convScale = convScale_;
        showDims = showDims_;
        showConvDims = showConvDims_;

        clearThree(scene);

        z_offset = -(sum(architecture.map(layer => depthFn(layer['depth']))) + (betweenLayers * (architecture.length - 1))) / 3;
        layer_offsets = pairWise(architecture).reduce((offsets, layers) => offsets.concat([offsets.last() + depthFn(layers[0]['depth'])/2 + betweenLayers + depthFn(layers[1]['depth'])/2]), [z_offset]);
        layer_offsets = layer_offsets.concat(architecture2.reduce((offsets, layer) => offsets.concat([offsets.last() + widthFn(2) + betweenLayers]), [layer_offsets.last() + depthFn(architecture.last()['depth'])/2 + betweenLayers + widthFn(2)]));

        architecture.forEach( function( layer, index ) {

            // Layer
            layer_geometry = new THREE.BoxGeometry( wf(layer), hf(layer), depthFn(layer['depth']) );
            layer_object = new THREE.Mesh( layer_geometry, box_material );
            layer_object.position.set(0, 0, layer_offsets[index]);
            layers.add( layer_object );

            layer_edges_geometry = new THREE.EdgesGeometry( layer_geometry );
            layer_edges_object = new THREE.LineSegments( layer_edges_geometry, line_material );
            layer_edges_object.position.set(0, 0, layer_offsets[index]);
            layers.add( layer_edges_object );

            if (index < architecture.length - 1) {

                // Conv
                conv_geometry = new THREE.BoxGeometry( convFn(layer['filterWidth']), convFn(layer['filterHeight']), depthFn(layer['depth']) );
                conv_object = new THREE.Mesh( conv_geometry, conv_material );
                conv_object.position.set(layer['rel_x'] * wf(layer), layer['rel_y'] * hf(layer), layer_offsets[index]);
                convs.add( conv_object );

                conv_edges_geometry = new THREE.EdgesGeometry( conv_geometry );
                conv_edges_object = new THREE.LineSegments( conv_edges_geometry, line_material );
                conv_edges_object.position.set(layer['rel_x'] * wf(layer), layer['rel_y'] * hf(layer), layer_offsets[index]);
                convs.add( conv_edges_object );

                // Pyramid
                pyramid_geometry = new THREE.Geometry();

                base_z = layer_offsets[index] + (depthFn(layer['depth']) / 2);
                summit_z = layer_offsets[index] + (depthFn(layer['depth']) / 2) + betweenLayers;
                next_layer_wh = widthFn(architecture[index+1]['width'])

                pyramid_geometry.vertices = [
                    new THREE.Vector3( (layer['rel_x'] * wf(layer)) + (convFn(layer['filterWidth'])/2), (layer['rel_y'] * hf(layer)) + (convFn(layer['filterHeight'])/2), base_z ),  // base
                    new THREE.Vector3( (layer['rel_x'] * wf(layer)) + (convFn(layer['filterWidth'])/2), (layer['rel_y'] * hf(layer)) - (convFn(layer['filterHeight'])/2), base_z ),  // base
                    new THREE.Vector3( (layer['rel_x'] * wf(layer)) - (convFn(layer['filterWidth'])/2), (layer['rel_y'] * hf(layer)) - (convFn(layer['filterHeight'])/2), base_z ),  // base
                    new THREE.Vector3( (layer['rel_x'] * wf(layer)) - (convFn(layer['filterWidth'])/2), (layer['rel_y'] * hf(layer)) + (convFn(layer['filterHeight'])/2), base_z ),  // base
                    new THREE.Vector3( (layer['rel_x'] * next_layer_wh),                           (layer['rel_y'] * next_layer_wh),                           summit_z)  // summit
                ];
                pyramid_geometry.faces = [new THREE.Face3(0,1,2),new THREE.Face3(0,2,3),new THREE.Face3(1,0,4),new THREE.Face3(2,1,4),new THREE.Face3(3,2,4),new THREE.Face3(0,3,4)];

                pyramid_object = new THREE.Mesh( pyramid_geometry, pyra_material );
                pyramids.add( pyramid_object );

                pyramid_edges_geometry = new THREE.EdgesGeometry( pyramid_geometry );
                pyramid_edges_object = new THREE.LineSegments( pyramid_edges_geometry, line_material );
                pyramids.add( pyramid_edges_object );

            }

            if (showDims) {

                // Dims
                sprite = makeTextSprite(rendererType === 'svg', layer['depth'].toString(), layer_object.position, new THREE.Vector3( wf(layer)/2 + 2, hf(layer)/2 + 2, 0 ));

                sprite = makeTextSprite(rendererType === 'svg', layer['width'].toString(), layer_object.position, new THREE.Vector3( wf(layer)/2 + 3, 0, depthFn(layer['depth'])/2 + 3 ));

                sprite = makeTextSprite(rendererType === 'svg', layer['height'].toString(), layer_object.position, new THREE.Vector3( 0, -hf(layer)/2 - 3, depthFn(layer['depth'])/2 + 3 ));

            }

            if (showConvDims && index < architecture.length - 1) {

                // Conv Dims
                sprite = makeTextSprite(rendererType === 'svg', layer['filterHeight'].toString(), conv_object.position, new THREE.Vector3( convFn(layer['filterWidth'])/2, -3, depthFn(layer['depth'])/2 + 3 ));

                sprite = makeTextSprite(rendererType === 'svg', layer['filterWidth'].toString(), conv_object.position, new THREE.Vector3( -1, convFn(layer['filterHeight'])/2, depthFn(layer['depth'])/2 + 3 ));

            }

        });

        architecture2.forEach( function( layer, index ) {

            // Dense
            layer_geometry = new THREE.BoxGeometry( widthFn(2), depthFn(layer), widthFn(2) );
            layer_object = new THREE.Mesh( layer_geometry, box_material );
            layer_object.position.set(0, 0, layer_offsets[architecture.length + index]);
            layers.add( layer_object );

            layer_edges_geometry = new THREE.EdgesGeometry( layer_geometry );
            layer_edges_object = new THREE.LineSegments( layer_edges_geometry, line_material );
            layer_edges_object.position.set(0, 0, layer_offsets[architecture.length + index]);
            layers.add( layer_edges_object );

            direction = new THREE.Vector3( 0, 0, 1 );
            origin = new THREE.Vector3( 0, 0, layer_offsets[architecture.length + index] - betweenLayers - widthFn(2)/2 + 1 );
            length = betweenLayers - 2;
            headLength = betweenLayers/3;
            headWidth = 5;
            arrow = new THREE.ArrowHelper( direction, origin, length, 0x000000, headLength, headWidth );
            pyramids.add( arrow );

            if (showDims) {

                // Dims
                sprite = makeTextSprite(rendererType === 'svg', layer.toString(), layer_object.position, new THREE.Vector3( 3, depthFn(layer)/2 + 4, 3 ));

            }


        });

        scene.add( layers );
        scene.add( convs );
        scene.add( pyramids );
        scene.add( sprites );

    }

    function clearThree(obj) {

        while(obj.children.length > 0) {
            clearThree( obj.children[0] )
            obj.remove( obj.children[0] );
        }

        if ( obj.geometry ) { obj.geometry.dispose(); }
        if ( obj.material ) { obj.material.dispose(); }
        if ( obj.texture ) { obj.texture.dispose(); }
    }


    function makeTextSprite(should_make_geometry, message, copy_pos, sub_pos, opts) {
        if (should_make_geometry) {
            const loader = new THREE.FontLoader();
            loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
                let geometry = new THREE.TextGeometry(message, {
                    font: font,
                    size: 3 * fontScale,
                    height: 0.01,
                });

                let material = new THREE.MeshBasicMaterial({ color: 0x000000 });
                let sprite = new THREE.Mesh(geometry, material);
                sprite.matrixAutoUpdate = true;
                sprite.up.set(0, 1, 0);
                sprite.scale.set(1, 1, 0.1);

                sprite.position.copy(copy_pos).sub(sub_pos);
                sprites.add(sprite);               
            });
        
        } else {
            var parameters = opts || {};
            var fontface = parameters.fontface || 'Helvetica';
            var fontsize = parameters.fontsize || 120;
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            context.font = fontsize + "px " + fontface;

            // get size data (height depends only on font size)
            var metrics = context.measureText(message);
            var textWidth = metrics.width;

            // text color
            context.fillStyle = 'rgba(0, 0, 0, 1.0)';
            context.fillText(message, 0, fontsize);

            // canvas contents will be used for a texture
            var texture = new THREE.Texture(canvas)
            texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;

            var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            var sprite = new THREE.Sprite( spriteMaterial );
            sprite.scale.set( 10 * fontScale, 5* fontScale, 1.0 );
            sprite.center.set( 0,1 );

            sprite.position.copy(copy_pos).sub(sub_pos);
            sprites.add(sprite);
        }
    }

    function style({color1_=color1,
                    color2_=color2,
                    color3_=color3,
                    rectOpacity_=rectOpacity,
                    filterOpacity_=filterOpacity,
                    fontScale_ =fontScale,
                }={}) {
        color1        = color1_;
        color2        = color2_;
        color3        = color3_;
        rectOpacity   = rectOpacity_;
        filterOpacity = filterOpacity_;
        fontScale = fontScale_;

        box_material.color = new THREE.Color(color1);
        conv_material.color = new THREE.Color(color2);
        pyra_material.color = new THREE.Color(color3);

        box_material.opacity = rectOpacity;

        conv_material.opacity = filterOpacity;
        pyra_material.opacity = filterOpacity;
    }

    // /////////////////////////////////////////////////////////////////////////////
    //                  ///////    Window Resize    ///////
    // /////////////////////////////////////////////////////////////////////////////

    function onWindowResize() {

        renderer.setSize(window.innerWidth, window.innerHeight);

        camFactor = window.devicePixelRatio || 1;
        camera.left = -window.innerWidth / camFactor;
        camera.right = window.innerWidth / camFactor;
        camera.top = window.innerHeight / camFactor;
        camera.bottom = -window.innerHeight / camFactor;
        camera.updateProjectionMatrix();

    }

    window.addEventListener('resize', onWindowResize, false);


    /////////////////////////////////////////////////////////////////////////////
                          ///////    Return    ///////
    /////////////////////////////////////////////////////////////////////////////

    return {
        'redraw'           : redraw,
        'restartRenderer'  : restartRenderer,
        'style'            : style,

    }

}
