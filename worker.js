onmessage = function(e) {
    console.log(e.data)
    if (e.data.type === 'extract') extractData(e.data.text);
    if (e.data.type === 'search') searchLogs(e.data);
    if (e.data.type === 'highlight') highlightSearch(e.data);
}

/**
 * @param {string} fullText
 */
function extractData(fullText) {
    if (!fullText) return;
    const jsonText = splitJSON((fullText));
    const { success, fail } = parseJSON(jsonText);
    const posted = {logs: success, failed: fail.join('\n'), type: 'extract'};
    postMessage(posted);
    const {keys, keyValues} = extractKeysAndUniq(success);
    posted.keys = keys;
    posted.keyValues = keyValues;
    postMessage(posted);
}

function searchLogs(data) {
    const {searchText, options} = data;
    if (!searchText || !options) return;
    data.filteredIDs = [];
    const filtered =  options.filter(option => {
        if (String(option.value).toLowerCase().includes(String(searchText).toLowerCase())) {
            data.filteredIDs.push(...option.ids);
            return true;
        }
    });
    const filteredIDMap = data.filteredIDs.reduce((ac, cu) => ({...ac, [cu]: true}), {});
    data.filtered = filtered;
    data.filteredLogs = data.filteredLogs.filter(log => filteredIDMap[log.id]);
    return postMessage(data);
}


function highlightSearch(data) {
    let {filteredLogs, searchTexts} = data;
    if (!filteredLogs || !searchTexts) return;
    Object.keys(searchTexts).forEach(key => {
        if (searchTexts[key] && searchTexts[key].length > 0) {
            searchTexts[key].forEach(text => {
                filteredLogs = data.filteredLogs;
                data.filteredLogs = filteredLogs.map(log => {
                    const logText = String(log.log[key]), searchText = String(text);
                    const matchIndex = logText.toLowerCase().indexOf(searchText.toLowerCase());
                    const matchText = logText.slice(matchIndex, matchIndex + searchText.length)
                    log.log[key] = logText.replace(matchText, `<span style="background-color:yellow;">${matchText}</span>`)
                    return log;
                })
            })
        }
    })
    postMessage(data);
}
/**
 * @param {any[]} logs
 */
function extractKeysAndUniq(logs) {
    const keys = new Set();
    const keyValues = {};

    logs.forEach(({log, id}) => {
        Object.keys(log).forEach(k => {
            keys.add(k);
            if (keyValues.hasOwnProperty(k)) {
                const valSet = keyValues[k];
                if (valSet.hasOwnProperty(String(log[k]))) {
                    valSet[String(log[k])].push(id);
                } else {
                    valSet[String(log[k])] = [id]
                }
            } else {
                keyValues[k] = {[String(log[k])]: [id]};
            }
        });
    });

    return { keys, keyValues: normalizeKeyValues(keyValues) }
}

function normalizeKeyValues(keyValues) {
    return Object.keys(keyValues).map(k => {
       const keyData = { key: k, values: [] };
        Object.keys(keyValues[k]).forEach((v, id) => {
            keyData.values.push({ value: v, ids: keyValues[k][v], vid: id});
        });
        return keyData;
    });
}

/**
 * @param {string} fullText
 * @returns {string[]}
 */
function splitJSON(fullText) {
    const stack = [];
    /** @type {start: number, end: number}[] */
    const pos = [];
    for (let i=0; i<fullText.length; i++) {
        if (['{', '['].includes(fullText[i])) stack.push(i);
        if (['}', ']'].includes(fullText[i])) {
            if (stack.length === 1) pos.push({start: stack[0], end: i});
            stack.pop();
        }
    }
    return pos.map((p,i) => fullText.substring(p.start, p.end + 1));
}

/**
 *
 * @param {string[]} jsonText
 */
function parseJSON(jsonText) {
    /** @type {any[]} */
    const success = [];
    /** @type {string[]} */
    const fail = [];
    let id = 0;
    for (let json of jsonText) {
        try {
            const parsed = JSON.parse(json);
            success.push({id, log: parsed});
            id++;
        } catch(err) {
            console.error('parseJSON', 'parse error', json, err);
            fail.push(json);
        }
    }
    return { success, fail };
}