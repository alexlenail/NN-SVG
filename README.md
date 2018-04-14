NN-SVG
======

What's conventionally described as the trellis structure of the connections between two
fully-connected layers of a neural network is really a visual description of a matrix-vector product.
Driven by the belief that mathematics are beautiful when properly represented,
I'm building a little tool to quickly generate SVG representations of these trellises,
to visualize classic fully-connected neural networks, on top of d3.


In the future I'd like to have three layouts:
- Conventional FCNN layout
- LeNet CNN layout
- AlexNet layout (via webGL)


<!-- TODO
	- download svg should eventually work.
	- arrowheads?
	- maybe add arrows pointing into input, out of output
	- color nodes in each layer separately?
	- add bias units option
 	- the entire thing can fold up
 -->
