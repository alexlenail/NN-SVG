
verticalDistance = 2
horizontalDistance = 2


$(document).ready ->

	architecture = [6, 6, 6, 1]  # later this will be a parameter
	anchor = [50, 475]
	nn = func_NN(anchor, architecture)

	s = new sigma
		graph: nn,
		container: 'graph-container',
		settings:
			drawEdges: true


func_NN = (P, architecture) ->

	nn = { layers: [], edges: [] }
	num_layers = architecture.length

	for layer, i in architecture

		P = [P[0]+i*horizontalDistance, P[1]]
		nn.layers.push Layer(P, i, layer)

	for layer, i in nn.layers

		for node, j in layer

			if i+1 < num_layers

				for target in nn.layers[i+1]

					nn.edges.push
						id: node.id + '-' + target.id,
						source: node.id,
						target: target.id


	nn.nodes = [].concat nn.layers...
	delete nn.layers
	return nn



Layer = (P, layer_id, num_nodes) ->

	nodes = []

	for j in [1..num_nodes]

		nodes.push
			id: layer_id + '.' + j,
			label: layer_id + '.' + j,
			x: P[0],
			y: P[1]+j*verticalDistance,
			size: 1
			color: '#123456'


	return nodes










