onmessage = function(e) {
    console.log('Worker: Message received from main script', JSON.stringify(e.data));
}