const {compile} = require("ypipe")
const { w } = require("ypipe-watch");
const npm = require('npm-commands')
const {docker} = require('ypipe-docker')
const {dgraph} = require('ypipe-dgraph')
const config = require("./config")

function test(){
    npm().run('tap');
}

const {up, down} = docker({name: "my-container-dgraph-v2.90", 
                           image: "dgraph/standalone:master", 
                           port: "8080"
                        })

const dql = dgraph(config)

async function main() {
    const t = `up[
                    w'[ dql? | test ]
                    down
                 ]`;
    const f = compile(t, {
                            namespace: {up, dql, test, down}, 
                            plugins: {w: w(["./tests/*.js", "./schema/*.*"])}
        });
    await f();
}

main()

