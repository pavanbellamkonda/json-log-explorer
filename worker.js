onmessage = function(e) {
    console.log('Worker: Message received from main script', JSON.stringify(e.data));
    console.log(e.data, splitJSON(e.data.text))

    return postMessage(splitJSON(e.data.text));
}


function splitJSON(fullText) {
    const stack = [];
    /** @type number[] */
    const pos = [];
    let pop = false;
    for (let i=0; i<fullText.length; i++) {
        pop = false;
        if (['{', '['].includes(fullText[i])) stack.push(fullText[i]);
        if (['}', ']'].includes(fullText[i])) {
            pop = true;
            stack.pop();
        }
        if (stack.length === 0 && pop) pos.push(i);
    }
    return pos.map((p,i) => fullText.substring((pos[i - 1] + 1)||0, p+1)).map(s => JSON.parse(s));
}