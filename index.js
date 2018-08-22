var firebase = require('firebase/app');
require('firebase/auth');
require('firebase/database');

var https = require("https")
async function getFunRetroConfig() {
    return new Promise((resolve, reject) => {
        const req = https.get("https://funretro.github.io/distributed/vendor.js", (res) => {
            let bodyString = "";
            res.on("data", (dat) => {
                bodyString += dat;
            })
            res.on("end", () => {
                // console.log("end")
                const searchFor = 'var config={apiKey:"';
                const index = bodyString.indexOf(searchFor) + "var config=".length;
                const endIndex = bodyString.indexOf('};', index) + 1;
                const config = bodyString.slice(index, endIndex).replace(/\s/ig, "");
                // Not nice to use eval..
                resolve(eval(`(${config})`));
            });
        }).on("error", reject);
    });
}

async function getFunRetroBoard(userId, config) {
    var app = firebase.initializeApp(config);
    // console.log({app});
    return app.auth().signInWithEmailAndPassword(`${userId}@fireideaz.com`, userId)
        .then((creds) => {
            // console.log({creds})
            // /boards/ -> board info, column names title etc
            const board = app.database().ref(`/boards/${userId}`)
            // /messages/ -> board content (each message).
            const messages = app.database().ref(`/messages/${userId}`)
            // console.log({board});
            return Promise.all([board.once('value'), messages.once('value')])
                .then(function([b, m]) {
                    const result = b.toJSON();
                    const msgs = m.toJSON();
                    for (const columnKey in result.columns) {
                        if (result.columns.hasOwnProperty(columnKey)) {
                            result.columns[columnKey].values = 
                            Object.keys(msgs)
                                .map((k) => msgs[k])
                                .filter((v) => v.type.id === result.columns[columnKey].id)
                        }
                    }
                    return result;
                });
        })
        .then((dat) => {
            firebase.auth().signOut()
            firebase.database().goOffline()
            return dat;
        }, (err) => {
            firebase.auth().signOut()
            firebase.database().goOffline()
            throw err;
        });
}

if (require.main === module) {
    let url = process.argv[0]
    while (url.indexOf('#') === -1) {
        url = process.argv.shift();
    }
    const userId = url.split('#')[1];
    getFunRetroConfig()
        .then((config) => getFunRetroBoard(userId, config))
        .then((v) => console.log(JSON.stringify(v, null, 4)));
} else {
    exports = {
        getFunRetroBoard,
        getFunRetroConfig
    }
}