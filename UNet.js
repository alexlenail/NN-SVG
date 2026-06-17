
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
    var legX = 0.5;
    var legY = 0.2;


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
    var showLegend = false;

    var colors = {"Conv" : clr_conv,
                "Pooling" : clr_pool,
                "Up-Conv": clr_upconv}

    let depthFn = (depth) => logDepth ? (Math.log(depth+0.5) * depthScale) : (depth * depthScale);
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
        if (showLegend){
            legend=getLegend(legX,legY);
            $("svg").html($("svg").html()+legend);
        }
    };

    restartRenderer();
    function getLegend(x,y){
        coords = $("svg").attr("viewBox").split(" ");
        start_x = parseInt(coords[0])+ (parseInt(coords[2]) - parseInt(coords[0]))*x;
        start_y = parseInt(coords[1])+ (parseInt(coords[3]) - parseInt(coords[1]))*y;
        // var legend = '<svg width="130" height="170">'

        // start_x = x-10;
        // start_y = y-27;

        var legend = '<rect width="130" height="170" x="'+(start_x +10) +'" y="'+(start_y + 27)+'"style="fill:rgb(220,220,220);stroke-width:2;stroke:rgb(0,0,0)" />';

        colors = {'Volume':$("#clr_vol").val(),
                    'Conv':$("#clr_conv").val(),
                    'Up-Conv':$("#clr_upconv").val(),
                    'Pooling':$("#clr_pool").val(),
                    'Concat':$("#clr_conn").val()};
        
        for(var key in colors) {
            legend += '<text x="'+(start_x +50) +'" y="'+(start_y + 57)+'" font-family="sans-serif" font-size="20px" fill="black">'+(key)+'</text>';
            legend += '<circle cx="'+(start_x +30)+'" cy="'+(start_y + 50)+'" r="10" fill="'+(colors[key])+'" />'
            start_y += 30;
        }
        return legend + '</svg>';
    }
    function adjust_offsets(layer_offsets,start_index,depth){
        for ( i=start_index;i<layer_offsets.length;i++){
            layer_offsets[i] -= (depth+betweenLayers)
        }
        return layer_offsets
    }

    function redraw({architecture_=architecture,
                     connections_=connections,
                     betweenLayers_=betweenLayers,
                     logDepth_=logDepth,
                     depthScale_=depthScale,
                     logWidth_=logWidth,
                     widthScale_=widthScale,
                     showDims_=showDims,
                     showLegend_=showLegend,
                     legX_=legX,
                     legY_=legY}={}) {

        architecture = architecture_;
        connections = connections_;
        betweenLayers = betweenLayers_;
        logDepth = logDepth_;
        depthScale = depthScale_;
        logWidth = logWidth_;
        widthScale = widthScale_;
        showDims = showDims_;
        showLegend = showLegend_;
        legX = legX_;
        legY = legY_

        clearThree(scene);

        z_offset = -(sum(architecture.map(layer => depthFn(layer['depth']))) + (betweenLayers * (architecture.length - 1))) / 3;
        layer_offsets = pairWise(architecture).reduce((offsets, layers) => offsets.concat([offsets.last() + depthFn(layers[0]['depth'])/2 + betweenLayers + depthFn(layers[1]['depth'])/2]), [z_offset]);
        layer_offsets = layer_offsets.concat(connections.reduce((offsets, layer) => offsets.concat([offsets.last() + widthFn(2) + betweenLayers]), [layer_offsets.last() + depthFn(architecture.last()['depth'])/2 + betweenLayers + widthFn(2)]));

        var level = 0
        var lvl_height = 70
        var lvls = [];
        architecture.forEach( function( layer, index ) {

            // Layer
            lvls.push(level);
            layer_geometry = new THREE.BoxGeometry( wh(layer), wh(layer), depthFn(layer['depth']) );
            layer_object = new THREE.Mesh( layer_geometry, vol_material );
            layer_object.position.set(0, level*lvl_height, layer_offsets[index]-(70./depthFn(layer['depth'])));
            layers.add( layer_object );

            layer_edges_geometry = new THREE.EdgesGeometry( layer_geometry );
            layer_edges_object = new THREE.LineSegments( layer_edges_geometry, line_material );
            layer_edges_object.position.set(0,level*lvl_height, layer_offsets[index] -(70./depthFn(layer['depth'])));
            layers.add( layer_edges_object );

            if (layer['op'] != "No Op."){
                if (layer['op'] == "Pooling"){
                    if (index+1 < architecture.length){
                        length = lvl_height - wh(layer)/2 - wh(architecture[index+1])/2;
                        direction = new THREE.Vector3(0,-1,0);
                        origin = new THREE.Vector3( 0, level*lvl_height - wh(layer)/2, layer_offsets[index]-(70./depthFn(layer['depth'])) );
                        level--;
                        layer_offsets = adjust_offsets(layer_offsets,index+1,depthFn(architecture[index+1]['depth']));
                    }else{
                        length = lvl_height;
                        direction = new THREE.Vector3(0,-1,0);
                        origin = new THREE.Vector3( 0, level*lvl_height - wh(layer)/2, layer_offsets[index] -(70./depthFn(layer['depth'])));
                        level--;
                    }
                    

                }else if (layer['op'] == "Up-Conv"){
                    if (index+1 < architecture.length){
                        length = lvl_height - wh(layer)/2 - wh(architecture[index+1])/2;
                        direction = new THREE.Vector3(0,1,0);
                        origin = new THREE.Vector3( 0, level*lvl_height + wh(layer)/2, layer_offsets[index] -(70./depthFn(layer['depth'])));
                        level++;
                        layer_offsets = adjust_offsets(layer_offsets,index+1,depthFn(architecture[index+1]['depth']));
                    }else{
                        length = lvl_height;
                        direction = new THREE.Vector3(0,1,0);
                        origin = new THREE.Vector3( 0, level*lvl_height + wh(layer)/2, layer_offsets[index] -(70./depthFn(layer['depth'])));
                        level++;
                    }
                    

                }else{
                    length = betweenLayers;
                    direction = new THREE.Vector3(0,0,1);
                    origin = new THREE.Vector3( 0, level*lvl_height, layer_offsets[index] + depthFn(layer['depth'])/2 -(70./depthFn(layer['depth'])));
                }
                
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
        connections.forEach( function( layer, index ) {

            // Skip connections
            
            half_depth_from = depthFn(architecture[layer['from']]['depth'])/2
            half_depth_to = depthFn(architecture[layer['to']]['depth'])/2
            direction = new THREE.Vector3( 0, 0, 1 );
            origin = new THREE.Vector3( 0,lvl_height*lvls[layer['from']] , layer_offsets[layer['from']] + half_depth_from);
            length = layer_offsets[layer['to']]-half_depth_to - layer_offsets[layer['from']] -half_depth_from - (70./(2*half_depth_to));
            headLength = betweenLayers/3;
            headWidth = 5;
            arrow = new THREE.ArrowHelper( direction, origin, length, clr_conn, headLength, headWidth );
            layers.add( arrow );

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
