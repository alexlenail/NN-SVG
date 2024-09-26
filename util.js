
let nWise = (n, array) => {
    iterators = Array(n).fill().map(() => array[Symbol.iterator]());
    iterators.forEach((it, index) => Array(index).fill().forEach(() => it.next()));
    return Array(array.length - n + 1).fill().map(() => (iterators.map(it => it.next().value)));
};

let pairWise = (array) => nWise(2, array);

let sum = (arr) => arr.reduce((a,b)=>a+b);

let range = n => [...Array(n).keys()];

let rand = (min, max) => Math.random() * (max - min) + min;

Array.prototype.last = function() { return this[this.length - 1]; };

let flatten = (array) => array.reduce((flat, toFlatten) => (flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten)), []);

let localize = s => s; // for English
/** for German * /
let localize = function(s) {
    var translations = {
        "Input Layer": "Eingabeschicht",
        "Output Layer": "Ausgabeschicht",
        "Hidden Layer": "Innere Schicht"
    };
    if (s in translations)
        return translations[s];
    else
        console.log("no translation for " + s);
        return s;
}/**/
