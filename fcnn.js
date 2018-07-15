
function FCNN() {

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

    function flatten(array) {
      return array.reduce(function (flat, toFlatten) {
        return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
      }, []);
    }

    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    let randomWeight = () => Math.random() * 2 - 1;

    /////////////////////////////////////////////////////////////////////////////
                          ///////    Variables    ///////
    /////////////////////////////////////////////////////////////////////////////

    var w = window.innerWidth;
    var h = window.innerHeight;

    var svg = d3.select("#graph-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");
    var g = svg.append("g");
    svg.style("cursor", "move");

    var edgeWidthProportional = false;
    var edgeWidth = 0.5;
    var weightedEdgeWidth = d3.scaleLinear().domain([0, 1]).range([0, edgeWidth]);

    var edgeOpacityProportional = false;
    var edgeOpacity = 1.0
    var weightedEdgeOpacity = d3.scaleLinear().domain([0, 1]).range([0, 1]);

    var edgeColorProportional = false;
    var defaultEdgeColor = "#505050";
    var negativeEdgeColor = "#0000ff";
    var positiveEdgeColor = "#ff0000";
    var weightedEdgeColor = d3.scaleLinear().domain([-1, 0, 1]).range([negativeEdgeColor, "white", positiveEdgeColor]);

    var nodeDiameter = 20;
    var nodeColor = "#ffffff";
    var nodeBorderColor = "#333333";

    var betweenLayers = 160;

    var architecture = [8, 12, 8];
    var betweenNodesInLayer = [20, 20, 20];
    var graph = {};
    var layer_offsets = [];
    var largest_layer_width = 0;
    var nnDirection = 'right'
    var showBias = false;

    var showLabels = true;
    let sup_map = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'};
    let sup = (s) => Array.prototype.map.call(s, (d) => (d in sup_map && sup_map[d]) || d).join('');

    let textFn = (layer_index, layer_width) => ((layer_index === 0 ? "Input" : (layer_index === architecture.length-1 ? "Output" : "Hidden")) + " Layer ∈ ℝ" + sup(layer_width.toString()));
    var nominal_text_size = 12;
    var textWidth = 70;

    var link = g.selectAll(".link");
    var node = g.selectAll(".node");
    var text = g.selectAll(".text");

    /////////////////////////////////////////////////////////////////////////////
                          ///////    Draw Graph    ///////
    /////////////////////////////////////////////////////////////////////////////

    function redraw(p_architecture = architecture) {

        architecture = p_architecture;

        graph.nodes = architecture.map((layer_width, layer_index) => range(layer_width).map(node_index => {return {'id':layer_index+'_'+node_index,'layer':layer_index,'node_index':node_index}}));
        graph.links = pairWise(graph.nodes).map((nodes) => nodes[0].map(left => nodes[1].map(right => {return right.node_index >= 0 ? {'source':left.id,'target':right.id,'weight':randomWeight()} : {} })));
        graph.nodes = flatten(graph.nodes);
        graph.links = flatten(graph.links).filter(l => (Object.keys(l).length > 0 && (showBias ? (parseInt(l['target'].split('_')[0]) !== architecture.length-1 ? (l['target'].split('_')[1] !== '0') : true) : true)));

        label = architecture.map((layer_width, layer_index) => { return {'id':'layer_'+layer_index+'_label','layer':layer_index,'text':textFn(layer_index, layer_width)}});

        link = link.data(graph.links);
        link.exit().remove();
        link = link.enter()
                   .insert("line", ".node")
                   .attr("class", "link")
                   .merge(link);

        node = node.data(graph.nodes);
        node.exit().remove();
        node = node.enter()
                   .append("circle")
                   .attr("r", nodeDiameter/2)
                   .attr("class", "node")
                   .attr("id", function(d) { return d.id; })
                   .on("mousedown", set_focus)
                   .on("mouseup", remove_focus)
                   .merge(node);

        text = text.data(label);
        if (text.empty()) { text = text.enter().append("text").attr("class", "text"); }
        text = text.text(function(d) { return (showLabels ? d.text : ""); })
                   .attr("dy", ".35em")
                   .style("font-size", nominal_text_size+"px")
                   .merge(text);

        setStyles();
    }

    function redistribute(p_betweenNodesInLayer = betweenNodesInLayer) {

        betweenNodesInLayer = p_betweenNodesInLayer;

        layer_widths = architecture.map((layer_width, i) => layer_width * nodeDiameter + (layer_width - 1) * betweenNodesInLayer[i])

        largest_layer_width = Math.max(...layer_widths);

        layer_offsets = layer_widths.map(layer_width => (largest_layer_width - layer_width) / 2);

        let indices_from_id = (id) => id.split('_').map(x => parseInt(x));

        let x = (layer, node_index) => layer * (betweenLayers + nodeDiameter) + w/2 - (betweenLayers * layer_offsets.length/3);
        let y = (layer, node_index) => layer_offsets[layer] + node_index * (nodeDiameter + betweenNodesInLayer[layer]) + h/2 - largest_layer_width/2;

        let xt = (layer, node_index) => layer_offsets[layer] + node_index * (nodeDiameter + betweenNodesInLayer[layer]) + w/2  - largest_layer_width/2;
        let yt = (layer, node_index) => layer * (betweenLayers + nodeDiameter) + h/2 - (betweenLayers * layer_offsets.length/3);

        if (nnDirection == 'up') { x = xt; y = yt; }

        node.attr('cx', function(d) { return x(d.layer, d.node_index); })
            .attr('cy', function(d) { return y(d.layer, d.node_index); });

        link.attr("x1", function(d) { return x(...indices_from_id(d.source)); })
            .attr("y1", function(d) { return y(...indices_from_id(d.source)); })
            .attr("x2", function(d) { return x(...indices_from_id(d.target)); })
            .attr("y2", function(d) { return y(...indices_from_id(d.target)); });

        text.attr("x", function(d) { return (nnDirection === 'right' ? x(d.layer, d.node_index) - textWidth/2 : w/2 + largest_layer_width/2 + 20 ); })
            .attr("y", function(d) { return (nnDirection === 'right' ? h/2 + largest_layer_width/2 + 20       : y(d.layer, d.node_index) ); });

    }

    function setStyles({edgeWidthProportional_=edgeWidthProportional,
                        edgeWidth_=edgeWidth,
                        edgeOpacityProportional_=edgeOpacityProportional,
                        edgeOpacity_=edgeOpacity,
                        negativeEdgeColor_=negativeEdgeColor,
                        positiveEdgeColor_=positiveEdgeColor,
                        edgeColorProportional_=edgeColorProportional,
                        defaultEdgeColor_=defaultEdgeColor,
                        nodeDiameter_=nodeDiameter,
                        nodeColor_=nodeColor,
                        nodeBorderColor_=nodeBorderColor}={}) {
        edgeWidthProportional = edgeWidthProportional_;
        edgeWidth             = edgeWidth_;
        weightedEdgeWidth     = d3.scaleLinear().domain([0, 1]).range([0, edgeWidth]);

        link.style("stroke-width", function(d) {
            if (edgeWidthProportional) { return weightedEdgeWidth(Math.abs(d.weight)); }
            else { return edgeWidth; }
        });

        edgeOpacityProportional = edgeOpacityProportional_;
        edgeOpacity             = edgeOpacity_;

        link.style("stroke-opacity", function(d) {
            if (edgeOpacityProportional) { return weightedEdgeOpacity(Math.abs(d.weight)); }
            else { return edgeOpacity; }
        });

        defaultEdgeColor      = defaultEdgeColor_;
        edgeColorProportional = edgeColorProportional_;
        negativeEdgeColor     = negativeEdgeColor_;
        positiveEdgeColor     = positiveEdgeColor_;
        weightedEdgeColor     = d3.scaleLinear().domain([-1, 0, 1]).range([negativeEdgeColor, "white", positiveEdgeColor]);

        link.style("stroke", function(d) {
            if (edgeColorProportional) { return weightedEdgeColor(d.weight); }
            else { return defaultEdgeColor; }
        });

        nodeDiameter    = nodeDiameter_;
        nodeColor       = nodeColor_;
        nodeBorderColor = nodeBorderColor_;

        node.attr("r", nodeDiameter/2);
        node.style("fill", nodeColor);
        node.style("stroke", nodeBorderColor);

    }

    function setBetweenLayers({betweenLayers_=betweenLayers}={}) {
        betweenLayers = betweenLayers_;
        redistribute();
    }

    function setNnDirection({nnDirection_=nnDirection}={}) {
        nnDirection = nnDirection_;
        redistribute();
    }

    function setShowBias({showBias_=showBias}={}) {
        showBias = showBias_;
        redraw();
        redistribute();
    }

    function setShowLabels({showLabels_=showLabels}={}) {
        showLabels = showLabels_;
        text.text(function (d) { return (showLabels ? d.text : ""); });
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
                          ///////    Focus    ///////
    /////////////////////////////////////////////////////////////////////////////

    function set_focus(d) {
        d3.event.stopPropagation();
        node.style("opacity", function(o) { return (d == o || o.layer == d.layer - 1) ? 1 : 0.1; });
        link.style("opacity", function(o) { return (o.target == d.id) ? 1 : 0.02; });
    }

    function remove_focus() {
        d3.event.stopPropagation();
        node.style("opacity", 1);
        link.style("opacity", function () { return edgeOpacity; })
    }

    return {
        'redraw'           : redraw,
        'redistribute'     : redistribute,

        'setStyles'        : setStyles,
        'setBetweenLayers' : setBetweenLayers,
        'setNnDirection'   : setNnDirection,
        'setShowBias'      : setShowBias,
        'setShowLabels'    : setShowLabels,

        'graph'            : graph,
        'link'             : link,

    }

}
