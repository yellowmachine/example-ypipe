const {Docker} = require('node-docker-api');
const _waitOn = require('wait-on');

async function stopAndDelete(container){
    console.log('stopping...')
    await container.stop()
    console.log('docker stopped')
    await container.delete({ force: true })
    console.log('docker deleted')
}

exports.docker = function({image, port, name, waitOn=null}){
    const docker = new Docker()
    let container = null
    if(waitOn === null){
        waitOn = "http://localhost:" + port
    }
    return {
        up: async () => {
            try{
                container = await docker.container.create({
                    Image: image,
                    name,
                    PortBindings: {
                        "8080/tcp": [{
                            "HostIP":"0.0.0.0",
                            "HostPort": port
                        }]
                    }
                })
                await container.start()
                await _waitOn({
                    resources: [waitOn]
                });
                console.log('docker started')
            }catch(err){
                console.log(err)
                if(container){
                    await stopAndDelete(container)
                }
                throw err
            }
        },
        down: async () => {
            await stopAndDelete(container)
        }
    }
}
