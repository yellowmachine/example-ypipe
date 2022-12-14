const Docker = require('node-docker-api').Docker
const {compile} = require("ypipe")
const { w } = require("ypipe-watch");
const npm = require('npm-commands')
const {docker} = require('ypipe-docker')
const {dgraph} = require('ypipe-dgraph')
const config = require("./config")

let _d = new Docker({ socketPath: '/var/run/docker.sock' })

function test(){
    npm().run('tap');
}

const {up, down} = docker({name: "my-container-dgraph", 
                           image: "dgraph/standalone:master", 
                           port: "8080"
                        })

const dql = dgraph(config)

async function main() {
    // we remove container if it exists, maybe a previous execution of this script didn't close cleany
    const containers = await _d.container.list()
    const c = containers.filter(x=>x.data.Names.includes('/my-container-dgraph'))[0];
    if(c) await c.delete({ force: true });

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

