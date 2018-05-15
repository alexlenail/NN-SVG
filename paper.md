---
title: 'NN-SVG: Publication-Ready Neural Network Architecture Schematics'
tags:
  - machine learning
  - deep learning
  - neural networks
  - visualization
authors:
 - name: Alexander LeNail
   orcid: 0000-0001-8173-2315
   affiliation: 1
affiliations:
 - name: Massachusetts Institute of Technology, dept of Biological Engineering
   index: 1
date: 14 May 2018
bibliography: paper.bib
---

# Summary

NN-SVG is a tool for creating Neural Network (NN) architecture drawings parametrically rather than by hand. It then provides the ability for those researchers to export those drawings to Scalable Vector Graphics (SVG) files, suitable for inclusion in academic papers or as figures on web pages.

The tool provides the ability to generate figures of three kinds: classic Fully-Connected Neural Network (FCNN) figures, Convolutional Neural Network (CNN) figures of the sort introduced in [@LeNet], and Deep Neural Network figures following the style introduced in [@AlexNet]. The former two are accomplished using the Data-Driven Documents (D3) javascript library [@d3] and the latter with Three.js.

We hope this tool will save machine learning researchers time which would otherwise be spent drawing figures by hand, and we hope this software might also serve as a pedagogical tool in some contexts.

# References
