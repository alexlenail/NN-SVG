
class FCNN {

    /////////////////////////////////////////////////////////////////////////////
                        ///////    Helpers    ///////
    /////////////////////////////////////////////////////////////////////////////

    static range(n) { return [...Array(n).keys()]; }

    static nWise(n, array) {
        var iterators = Array(n).fill().map(() => array[Symbol.iterator]());
        iterators.forEach((it, index) => Array(index).fill().forEach(() => it.next()));
        return Array(array.length - n + 1).fill().map(() => (iterators.map(it => it.next().value)));
    };

    static pairWise(array) { return FCNN.nWise(2, array); }

    static flatten(array) {
        return array.reduce((flat, toFlatten) => (flat.concat(Array.isArray(toFlatten) ? FCNN.flatten(toFlatten) : toFlatten)), []);
    }

    static randomWeight() { return Math.random() * 2 - 1; }


    /////////////////////////////////////////////////////////////////////////////
                          ///////    Constructor    ///////
    /////////////////////////////////////////////////////////////////////////////

    constructor() {

        this.w = window.innerWidth;
        this.h = window.innerHeight;

        this.svg = d3.select("#graph-container").append("svg").attr("xmlns", "http://www.w3.org/2000/svg");
        this.g = this.svg.append("g");
        this.svg.style("cursor", "move");
        this.svg.call(d3.zoom().scaleExtent([1 / 2, 8]).on("zoom", () => this.g.attr("transform", d3.event.transform) ));

        this.edgeWidthProportional = false;
        this.edgeWidth = 0.5;
        this.weightedEdgeWidth = d3.scaleLinear().domain([0, 1]).range([0, this.edgeWidth]);

        this.edgeOpacityProportional = false;
        this.edgeOpacity = 1.0
        this.weightedEdgeOpacity = d3.scaleLinear().domain([0, 1]).range([0, 1]);

        this.edgeColorProportional = false;
        this.defaultEdgeColor = "#505050";
        this.negativeEdgeColor = "#0000ff";
        this.positiveEdgeColor = "#ff0000";
        this.weightedEdgeColor = d3.scaleLinear().domain([-1, 0, 1]).range([this.negativeEdgeColor, "white", this.positiveEdgeColor]);

        this.nodeDiameter = 20;
        this.nodeColor = "#ffffff";
        this.nodeBorderColor = "#333333";

        this.betweenLayers = 160;

        this.architecture = [8, 12, 8];
        this.betweenNodesInLayer = [20, 20, 20];
        this.graph = {};
        this.layer_offsets = [];
        this.largest_layer_width = 0;
        this.nnDirection = 'right'
        this.showBias = false;

        this.showLabels = true;
        this.sup_map = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'};

        this.nominal_text_size = 12;
        this.textWidth = 70;

        this.link = this.g.selectAll(".link");
        this.node = this.g.selectAll(".node");
        this.text = this.g.selectAll(".text");

        d3.select(window).on("resize", this.resize)

        this.resize();
        this.redraw();

    }

    sup(s) { return Array.prototype.map.call(s, (d) => (d in this.sup_map && this.sup_map[d]) || d).join(''); }

    textFn(layer_index, layer_width) { return ((layer_index === 0 ? "Input" : (layer_index === this.architecture.length-1 ? "Output" : "Hidden")) + " Layer ∈ ℝ" + this.sup(layer_width.toString())); }


    /////////////////////////////////////////////////////////////////////////////
                          ///////    Methods    ///////
    /////////////////////////////////////////////////////////////////////////////

    redraw() {

        console.log(this.architecture);


        this.graph.nodes = this.architecture.map((layer_width, layer_index) => FCNN.range(layer_width).map(node_index => {return {'id':layer_index+'_'+node_index,'layer':layer_index,'node_index':node_index}}));
        this.graph.links = FCNN.pairWise(this.graph.nodes).map((nodes) => nodes[0].map(left => nodes[1].map(right => {return right.node_index >= 0 ? {'source':left.id,'target':right.id,'weight':FCNN.randomWeight()} : {} })));
        this.graph.nodes = FCNN.flatten(this.graph.nodes);
        this.graph.links = FCNN.flatten(this.graph.links).filter(l => (Object.keys(l).length > 0 && (this.showBias ? (parseInt(l['target'].split('_')[0]) !== this.architecture.length-1 ? (l['target'].split('_')[1] !== '0') : true) : true)));

        this.label = this.architecture.map((layer_width, layer_index) => { return {'id':'layer_'+layer_index+'_label','layer':layer_index,'text':this.textFn(layer_index, layer_width)}});

        this.link = this.link.data(this.graph.links);
        this.link.exit().remove();
        this.link = this.link.enter()
                        .insert("line", ".node")
                        .attr("class", "link")
                        .style("stroke-width", function(d) {
                            if (this.edgeWidthProportional) { return this.weightedEdgeWidth(Math.abs(d.weight)); }
                            else { return this.edgeWidth; }
                        })
                        .style("stroke", function(d) {
                            if (this.edgeColorProportional) { return this.weightedEdgeColor(d.weight); }
                            else { console.log(this.edgeColorProportional); return this.defaultEdgeColor; }
                        })
                        .style("opacity", this.edgeOpacity)
                        .merge(this.link);

        this.node = this.node.data(this.graph.nodes);
        this.node.exit().remove();
        this.node = this.node.enter()
                             .append("circle")
                             .attr("r", this.nodeDiameter/2)
                             .attr("class", "node")
                             .attr("id", function(d) { return d.id; })
                             .style("fill", this.nodeColor)
                             .style("stroke", this.nodeBorderColor)
                             .style("stroke-width", 1)
                             // .on("mousedown", this.set_focus)
                             // .on("mouseup", this.remove_focus)
                             .merge(this.node);

        this.text = this.text.data(this.label);
        if (this.text.empty()) { this.text = this.text.enter().append("text").attr("class", "text"); }
        this.text = this.text
                        .text(function(d) { return (this.showLabels ? d.text : ""); })
                        .attr("dy", ".35em")
                        .style("font-size", this.nominal_text_size+"px")
                        .merge(this.text);

        this.redistribute();
    }

    redistribute() {

        var layer_widths = this.architecture.map((layer_width, i) => layer_width * this.nodeDiameter + (layer_width - 1) * this.betweenNodesInLayer[i])

        var largest_layer_width = Math.max(...layer_widths);

        var layer_offsets = layer_widths.map(layer_width => (largest_layer_width - layer_width) / 2);

        let indices_from_id = (id) => id.split('_').map(x => parseInt(x));

        let x = (layer, node_index) => layer * (this.betweenLayers + this.nodeDiameter) + this.w/2 - (this.betweenLayers * layer_offsets.length/3);
        let y = (layer, node_index) => layer_offsets[layer] + node_index * (this.nodeDiameter + this.betweenNodesInLayer[layer]) + this.h/2 - largest_layer_width/2;

        let xt = (layer, node_index) => layer_offsets[layer] + node_index * (this.nodeDiameter + this.betweenNodesInLayer[layer]) + this.w/2  - largest_layer_width/2;
        let yt = (layer, node_index) => layer * (this.betweenLayers + this.nodeDiameter) + this.h/2 - (this.betweenLayers * layer_offsets.length/3);

        if (this.nnDirection == 'up') { x = xt; y = yt; }

        this.node.attr('cx', function(d) { return x(d.layer, d.node_index); })
                 .attr('cy', function(d) { return y(d.layer, d.node_index); });

        this.link.attr("x1", function(d) { return x(...indices_from_id(d.source)); })
                 .attr("y1", function(d) { return y(...indices_from_id(d.source)); })
                 .attr("x2", function(d) { return x(...indices_from_id(d.target)); })
                 .attr("y2", function(d) { return y(...indices_from_id(d.target)); });

        this.text.attr("x", function(d) { return (this.nnDirection === 'right' ? x(d.layer, d.node_index) - this.textWidth/2 : this.w/2 + largest_layer_width/2 + 20 ); })
                 .attr("y", function(d) { return (this.nnDirection === 'right' ? this.h/2 + largest_layer_width/2 + 20       : y(d.layer, d.node_index) ); });

    }

    set_focus(d) {
        d3.event.stopPropagation();
        this.node.style("opacity", function(o) { return (d == o || o.layer == d.layer - 1) ? 1 : 0.1; });
        this.link.style("opacity", function(o) { return (o.target == d.id) ? 1 : 0.02; });
    }

    remove_focus() {
        d3.event.stopPropagation();
        this.node.style("opacity", 1);
        this.link.style("opacity", this.edgeOpacity)
    }

    resize() {
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.svg.attr("width", this.w).attr("height", this.h);
    }

}

