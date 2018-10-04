
function UNet() {

    // /////////////////////////////////////////////////////////////////////////////
    //                     ///////    Helper Functions    ///////
    // /////////////////////////////////////////////////////////////////////////////

    let nWise = (n, array) => {
      iterators = Array(n).fill().map(() => array[Symbol.iterator]());
      iterators.forEach((it, index) => Array(index).fill().forEach(() => it.next()));
      return Array(array.length - n + 1).fill().map(() => (iterators.map(it => it.next().value)));
    };

    let pairWise = (array) => nWise(2, array);

    let sum = (arr) => arr.reduce((a,b)=>a+b);

    let rand = (min, max) => Math.random() * (max - min) + min;

    Array.prototype.last = function() { return this[this.length - 1]; };


    // /////////////////////////////////////////////////////////////////////////////
    //                       ///////    Variables    ///////
    // /////////////////////////////////////////////////////////////////////////////

    var w = window.innerWidth;
    var h = window.innerHeight;

    var clr_vol = '#5a9dd6';
    var clr_conv = '#7030a0';
    var clr_upconv = '#ffc000';
    var clr_pool = '#c10000';
    var clr_conn = '#6dae47';

    var rectOpacity = 0.4;


    var line_material = new THREE.LineBasicMaterial( { 'color':0x000000 } );
    var vol_material = new THREE.MeshBasicMaterial( {'color':clr_vol, 'side':THREE.DoubleSide, 'transparent':true, 'opacity':rectOpacity, 'depthWrite':false, 'needsUpdate':true} );

    var architecture = [];
    var connections = [];
    var betweenLayers = 20;

    var logDepth = true;
    var depthScale = 10;
    var logWidth = true;
    var widthScale = 10;

    var showDims = false;

    var colors = {"Conv" : clr_conv,
                "Pooling" : clr_pool,
                "Up-Conv": clr_upconv}

    let depthFn = (depth) => logDepth ? (Math.log(depth) * depthScale) : (depth * depthScale);
    let widthFn = (width) => logWidth ? (Math.log(width) * widthScale) : (width * widthScale);

    function wh(layer) { return widthFn(layer['widthAndHeight']); }

    var layers = new THREE.Group();
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
    //                       ///////    Draw Graph    ///////
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
        renderer.render(scene, camera);
    };

    restartRenderer();

    function redraw({architecture_=architecture,
                     connections_=connections,
                     betweenLayers_=betweenLayers,
                     logDepth_=logDepth,
                     depthScale_=depthScale,
                     logWidth_=logWidth,
                     widthScale_=widthScale,
                     showDims_=showDims}={}) {

        architecture = architecture_;
        connections = connections_;
        betweenLayers = betweenLayers_;
        logDepth = logDepth_;
        depthScale = depthScale_;
        logWidth = logWidth_;
        widthScale = widthScale_;
        showDims = showDims_;

        clearThree(scene);
        var widths= [];

        z_offset = -(sum(architecture.map(layer => depthFn(layer['depth']))) + (betweenLayers * (architecture.length - 1))) / 3;
        layer_offsets = pairWise(architecture).reduce((offsets, layers) => offsets.concat([offsets.last() + depthFn(layers[0]['depth'])/2 + betweenLayers + depthFn(layers[1]['depth'])/2]), [z_offset]);
        layer_offsets = layer_offsets.concat(connections.reduce((offsets, layer) => offsets.concat([offsets.last() + widthFn(2) + betweenLayers]), [layer_offsets.last() + depthFn(architecture.last()['depth'])/2 + betweenLayers + widthFn(2)]));

        architecture.forEach( function( layer, index ) {

            // Layer
            widths.push(wh(layer))

            layer_geometry = new THREE.BoxGeometry( wh(layer), wh(layer), depthFn(layer['depth']) );
            layer_object = new THREE.Mesh( layer_geometry, vol_material );
            layer_object.position.set(0, 0, layer_offsets[index]);
            layers.add( layer_object );

            layer_edges_geometry = new THREE.EdgesGeometry( layer_geometry );
            layer_edges_object = new THREE.LineSegments( layer_edges_geometry, line_material );
            layer_edges_object.position.set(0, 0, layer_offsets[index]);
            layers.add( layer_edges_object );

            if (layer['op'] != "No Op."){
                direction = new THREE.Vector3( 0, 0, 1 );
                origin = new THREE.Vector3( 0, 0, layer_offsets[index] + depthFn(layer['depth'])/2);
                length = betweenLayers;
                headLength = betweenLayers/3;
                headWidth = 5;
                arrow = new THREE.ArrowHelper( direction, origin, length, colors[layer['op']], headLength, headWidth );
                layers.add( arrow );
             }

            if (showDims) {

                // Dims
                sprite = makeTextSprite(layer['depth'].toString());
                sprite.position.copy( layer_object.position ).sub( new THREE.Vector3( wh(layer)/2 + 2, wh(layer)/2 + 2, 0 ) );
                sprites.add( sprite );

                sprite = makeTextSprite(layer['widthAndHeight'].toString());
                sprite.position.copy( layer_object.position ).sub( new THREE.Vector3( wh(layer)/2 + 3, 0, depthFn(layer['depth'])/2 + 3 ) );
                sprites.add( sprite );

                sprite = makeTextSprite(layer['widthAndHeight'].toString());
                sprite.position.copy( layer_object.position ).sub( new THREE.Vector3( 0, -wh(layer)/2 - 3, depthFn(layer['depth'])/2 + 3 ) );
                sprites.add( sprite );

            }

        });
        height = 15;
        connections.forEach( function( layer, index ) {

            // Skip connections
            // up link
            direction = new THREE.Vector3( 0, 1, 0 );
            origin = new THREE.Vector3( 0,widths[layer['from']]/2, layer_offsets[layer['from']] );
            length = widthFn(height);
            headLength = 1e-16;
            headWidth = 1e-16;
            arrow = new THREE.ArrowHelper( direction, origin, length, clr_conn, headLength, headWidth );
            layers.add( arrow );

            //right link
            direction = new THREE.Vector3( 0, 0, 1 );
            origin = new THREE.Vector3( 0,widths[layer['from']]/2 + widthFn(height), layer_offsets[layer['from']] );
            length = layer_offsets[layer['to']] - layer_offsets[layer['from']];
            headLength = 1e-16;
            headWidth = 1e-16;
            arrow = new THREE.ArrowHelper( direction, origin, length, clr_conn, headLength, headWidth );
            layers.add( arrow );

            //down arrow
            direction = new THREE.Vector3( 0, -1, 0 );
            origin = new THREE.Vector3( 0,widths[layer['from']]/2 + widthFn(height), layer_offsets[layer['to']] );
            length = widthFn(height);
            headLength = betweenLayers/3;
            headWidth = 5;
            arrow = new THREE.ArrowHelper( direction, origin, length, clr_conn, headLength, headWidth );
            layers.add( arrow );

            height += 20;

        });

        scene.add( layers );
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


    function makeTextSprite(message, opts) {
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
        sprite.scale.set( 10, 5, 1.0 );
        sprite.center.set( 0,1 );
        return sprite;
    }
    function style({clr_vol_=clr_vol,
                    clr_conv_=clr_conv,
                    clr_upconv_=clr_upconv,
                    rectOpacity_=rectOpacity,
                    clr_pool_=clr_pool,
                    clr_conn_=clr_conn}={}) {
        clr_vol        = clr_vol_;
        clr_conv        = clr_conv_;
        clr_upconv        = clr_upconv_;
        clr_pool        = clr_pool_;
        clr_conn        = clr_conn_;

        rectOpacity   = rectOpacity_;

        vol_material.color = new THREE.Color(clr_vol);

        vol_material.opacity = rectOpacity;

        colors = {"Conv" : clr_conv,
                "Pooling" : clr_pool,
                "Up-Conv": clr_upconv}
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
