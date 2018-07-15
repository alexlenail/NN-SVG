
function LeNet() {

    /////////////////////////////////////////////////////////////////////////////
                        ///////    Helper Functions    ///////
    /////////////////////////////////////////////////////////////////////////////

    let range = n => [...Array(n).keys()];

    let nWise = (n, array) => {
        iterators = Array(n).fill().map(() => array[Symbol.iterator]());
        iterators.forEach((it, index) => Array(index).fill().forEach(() => it.next()));
        return Array(array.length - n + 1).fill().map(() => (iterators.map(it => it.next().value)));
    };

    let pairWise = (array) => nWise(2, array);

    let flatten = (array) => array.reduce((flat, toFlatten) => (flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten)), []);

    let rand = (min, max) => Math.random() * (max - min) + min;

    Array.prototype.last = function() { return this[this.length - 1]; };


    /////////////////////////////////////////////////////////////////////////////
                          ///////    Variables    ///////
    /////////////////////////////////////////////////////////////////////////////

    var w = window.innerWidth;
    var h = window.innerHeight;

    var svg = d3.select("#graph-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");
    var g = svg.append("g");
    svg.style("cursor", "move");

    var color1 = '#e0e0e0';
    var color2 = '#a0a0a0';
    var borderWidth = 1.0;
    var borderColor = "black";
    var rectOpacity = 0.8;
    var betweenSquares = 8;
    var betweenLayers = [];
    var betweenLayersDefault = 12;

    // numberOfSquares, squareWidth, stride.
    var architecture = [];
    var lenet = {};
    var layer_offsets = [];
    var largest_layer_width = 0;
    var showLabels = true;

    let textFn = (layer) => (typeof(layer) === "object" ? layer['numberOfSquares']+'@'+layer['squareWidth']+'x'+layer['squareWidth'] : "1x"+layer)

    var rect = g.selectAll(".rect");
    var conv = g.selectAll(".conv");
    var link = g.selectAll(".link");
    var poly = g.selectAll(".poly");
    var line = g.selectAll(".line");
    var text = g.selectAll(".text");
    var info = g.selectAll(".info");

    /////////////////////////////////////////////////////////////////////////////
                          ///////    Draw Graph    ///////
    /////////////////////////////////////////////////////////////////////////////

    function redraw({architecture_=architecture,
                     architecture2_=architecture2}={}) {

        architecture = architecture_;

        lenet.rects = architecture.map((layer, layer_index) => range(layer['numberOfSquares']).map(rect_index => {return {'id':layer_index+'_'+rect_index,'layer':layer_index,'rect_index':rect_index,'side':layer['squareWidth']}}));
        lenet.rects = flatten(lenet.rects);

        lenet.convs = architecture.map((layer, layer_index) => Object.assign({'id':'conv_'+layer_index,'layer':layer_index}, layer)); lenet.convs.pop();
        lenet.convs = lenet.convs.map(conv => Object.assign({'x_rel':rand(0.1, 0.9),'y_rel':rand(0.1, 0.9)}, conv))

        lenet.conv_links = lenet.convs.map(conv => {return [Object.assign({'id':'link_'+conv['layer']+'_0','i':0},conv), Object.assign({'id':'link_'+conv['layer']+'_1','i':1},conv)]});
        lenet.conv_links = flatten(lenet.conv_links);

        lenet.fc_layers = architecture2.map((size, fc_layer_index) => {return {'id': 'fc_'+fc_layer_index, 'layer':fc_layer_index+architecture.length, 'size':size/Math.sqrt(2)}});
        lenet.fc_links = lenet.fc_layers.map(fc => { return [Object.assign({'id':'link_'+fc['layer']+'_0','i':0,'prevSize':10},fc), Object.assign({'id':'link_'+fc['layer']+'_1','i':1,'prevSize':10},fc)]});
        lenet.fc_links = flatten(lenet.fc_links);
        lenet.fc_links[0]['prevSize'] = 0;                           // hacks
        lenet.fc_links[1]['prevSize'] = lenet.rects.last()['side'];  // hacks

        label = $('#architecture').find('input[type="text"]').map((i,el) => $(el).val()).get().map((op, i) => {return {'id':'op_'+i, 'layer':i, 'op':op}})
        .concat(architecture2.map((op, i) => { return {'id':'op_'+i+architecture.length,'layer':i+architecture.length,'op':'Dense'}}));  label.pop();
        label2 = architecture.map((layer, layer_index) => { return {'id':'data_'+layer_index+'_label','layer':layer_index,'text':textFn(layer)}})
        .concat(architecture2.map((layer, layer_index) => { return {'id':'data_'+layer_index+architecture.length+'_label','layer':layer_index+architecture.length,'text':textFn(layer)}}) );

        rect = rect.data([]);
        rect.exit().remove();
        rect = rect.data(lenet.rects);
        rect = rect.enter()
                   .append("rect")
                   .attr("class", "rect")
                   .attr("id", function(d) { return d.id; })
                   .attr("width", function(d) { return d.side; })
                   .attr("height", function(d) { return d.side; })
                   .merge(rect);

        conv = conv.data([]);
        conv.exit().remove();
        conv = conv.data(lenet.convs);
        conv = conv.enter()
                   .append("rect")
                   .attr("class", "conv")
                   .attr("id", function(d) { return d.id; })
                   .attr("width", function(d) { return d.stride; })
                   .attr("height", function(d) { return d.stride; })
                   .style("fill-opacity", 0)
                   .merge(conv);

        link = link.data([]);
        link.exit().remove();
        link = link.data(lenet.conv_links);
        link = link.enter()
                   .append("line")
                   .attr("class", "link")
                   .attr("id", function(d) { return d.id; })
                   .merge(link);

        poly = poly.data([]);
        poly.exit().remove();
        poly = poly.data(lenet.fc_layers);
        poly = poly.enter()
                   .append("polygon")
                   .attr("class", "poly")
                   .attr("id", function(d) { return d.id; })
                   .merge(poly);

        line = line.data([]);
        line.exit().remove();
        line = line.data(lenet.fc_links);
        line = line.enter()
                   .append("line")
                   .attr("class", "line")
                   .attr("id", function(d) { return d.id; })
                   .merge(line);

        text = text.data([]);
        text.exit().remove();
        text = text.data(label);
        text = text.enter()
                   .append("text")
                   .text(function (d) { return (showLabels ? d.op : ""); })
                   .attr("class", "text")
                   .attr("dy", ".35em")
                   .style("font-size", "16px")
                   .attr("font-family", "sans-serif")
                   .merge(text);

        info = info.data([]);
        info.exit().remove();
        info = info.data(label2);
        info = info.enter()
                   .append("text")
                   .text(function (d) { return (showLabels ? d.text : ""); })
                   .attr("class", "info")
                   .attr("dy", "-0.3em")
                   .style("font-size", "16px")
                   .attr("font-family", "sans-serif")
                   .merge(info);

        style();

    }

    function redistribute({betweenLayers_=betweenLayers,
                           betweenSquares_=betweenSquares}={}) {

        betweenLayers = betweenLayers_;
        betweenSquares = betweenSquares_;

        layer_widths = architecture.map((layer, i) => (layer['numberOfSquares']-1) * betweenSquares + layer['squareWidth']);
        layer_widths = layer_widths.concat(lenet.fc_layers.map((layer, i) => layer['size']));

        largest_layer_width = Math.max(...layer_widths);

        layer_x_offsets = layer_widths.reduce((offsets, layer_width, i) => offsets.concat([offsets.last() + layer_width + (betweenLayers[i] || betweenLayersDefault) ]), [0]);
        layer_y_offsets = layer_widths.map(layer_width => (largest_layer_width - layer_width) / 2);

        screen_center_x = w/2 - architecture.length * largest_layer_width/2;
        screen_center_y = h/2 - largest_layer_width/2;

        let x = (layer, node_index) => layer_x_offsets[layer] + (node_index * betweenSquares) + screen_center_x;
        let y = (layer, node_index) => layer_y_offsets[layer] + (node_index * betweenSquares) + screen_center_y;

        rect.attr('x', function(d) { return x(d.layer, d.rect_index); })
            .attr('y', function(d) { return y(d.layer, d.rect_index); });

        let xc = (d) => (layer_x_offsets[d.layer]) + ((d['numberOfSquares']-1) * betweenSquares) + (d['x_rel'] * (d['squareWidth'] - d['stride'])) + screen_center_x;
        let yc = (d) => (layer_y_offsets[d.layer]) + ((d['numberOfSquares']-1) * betweenSquares) + (d['y_rel'] * (d['squareWidth'] - d['stride'])) + screen_center_y;

        conv.attr('x', function(d) { return xc(d); })
            .attr('y', function(d) { return yc(d); });

        link.attr("x1", function(d) { return xc(d) + d['stride']; })
            .attr("y1", function(d) { return yc(d) + (d.i ? 0 : d['stride']); })
            .attr("x2", function(d) { return (layer_x_offsets[d.layer+1]) + ((architecture[d.layer+1]['numberOfSquares']-1) * betweenSquares) + architecture[d.layer+1]['squareWidth'] * d.x_rel + screen_center_x })
            .attr("y2", function(d) { return (layer_y_offsets[d.layer+1]) + ((architecture[d.layer+1]['numberOfSquares']-1) * betweenSquares) + architecture[d.layer+1]['squareWidth'] * d.y_rel + screen_center_y });


        poly.attr("points", function(d) {
            return ((layer_x_offsets[d.layer]+screen_center_x)           +','+(layer_y_offsets[d.layer]+screen_center_y)+
                ' '+(layer_x_offsets[d.layer]+screen_center_x+10)        +','+(layer_y_offsets[d.layer]+screen_center_y)+
                ' '+(layer_x_offsets[d.layer]+screen_center_x+d.size+10) +','+(layer_y_offsets[d.layer]+screen_center_y+d.size)+
                ' '+(layer_x_offsets[d.layer]+screen_center_x+d.size)    +','+(layer_y_offsets[d.layer]+screen_center_y+d.size));
        });

        line.attr("x1", function(d) { return layer_x_offsets[d.layer-1] + (d.i ? 0 : layer_widths[d.layer-1]) + d.prevSize + screen_center_x})
            .attr("y1", function(d) { return layer_y_offsets[d.layer-1] + (d.i ? 0 : layer_widths[d.layer-1]) + screen_center_y})
            .attr("x2", function(d) { return layer_x_offsets[d.layer] + (d.i ? 0 : d.size) + screen_center_x})
            .attr("y2", function(d) { return layer_y_offsets[d.layer] + (d.i ? 0 : d.size) + screen_center_y});

        text.attr('x', function(d) { return (layer_x_offsets[d.layer] + layer_widths[d.layer] + layer_x_offsets[d.layer+1] + layer_widths[d.layer+1]/2)/2 + screen_center_x -15; })
            .attr('y', function(d) { return layer_y_offsets[0] + screen_center_y + largest_layer_width;  });

        info.attr('x', function(d) { return layer_x_offsets[d.layer] + screen_center_x; })
            .attr('y', function(d) { return layer_y_offsets[d.layer] + screen_center_y - 15;  });

    }


    function style({color1_=color1,
                    color2_=color2,
                    borderWidth_=borderWidth,
                    rectOpacity_=rectOpacity,
                    showLabels_=showLabels}={}) {
        color1      = color1_;
        color2      = color2_;
        borderWidth = borderWidth_;
        rectOpacity = rectOpacity_;
        showLabels  = showLabels_;

        rect.style("fill", function(d) { return d.rect_index % 2 ? color1 : color2});
        poly.style("fill", color1);

        rect.style("stroke", borderColor);
        conv.style("stroke", borderColor);
        link.style("stroke", borderColor);
        poly.style("stroke", borderColor);
        line.style("stroke", borderColor);

        rect.style("stroke-width", borderWidth);
        conv.style("stroke-width", borderWidth);
        link.style("stroke-width", borderWidth / 2);
        poly.style("stroke-width", borderWidth);
        line.style("stroke-width", borderWidth / 2);

        rect.style("opacity", rectOpacity);
        conv.style("stroke-opacity", rectOpacity);
        link.style("stroke-opacity", rectOpacity);
        poly.style("opacity", rectOpacity);
        line.style("stroke-opacity", rectOpacity);

        text.text(function (d) { return (showLabels ? d.op : ""); });
        info.text(function (d) { return (showLabels ? d.text : ""); });
    }

    /////////////////////////////////////////////////////////////////////////////
                          ///////    Zoom    ///////
    /////////////////////////////////////////////////////////////////////////////

    svg.call(d3.zoom()
               .scaleExtent([1 / 2, 8])
               .on("zoom", zoomed));

    function zoomed() { g.attr("transform", d3.event.transform); }


    /////////////////////////////////////////////////////////////////////////////
                          ///////    Resize    ///////
    /////////////////////////////////////////////////////////////////////////////

    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        svg.attr("width", w).attr("height", h);
    }

    d3.select(window).on("resize", resize)

    resize();


    /////////////////////////////////////////////////////////////////////////////
                          ///////    Return    ///////
    /////////////////////////////////////////////////////////////////////////////

    return {
        'redraw'         : redraw,
        'redistribute'   : redistribute,
        'style'          : style,
    }

}
