const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { GraphQLClient, gql } = require('graphql-request')
const jwt = require('jsonwebtoken');
const config = require("./config.js")

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

async function dropData(){
    await axios.post(`${config.url}:${config.port}` + "/alter", {drop_op: "DATA"})
}

function token(claims){
    return jwt.sign({ [config.claims]: claims }, config.secret);
}

function tokenizedGraphQLClient(token){
    return new GraphQLClient(`${config.url}:${config.port}` + "/graphql", { headers: {Authorization: `Bearer ${token}`} })
}

function client(claims){
    return tokenizedGraphQLClient(token(claims))
}

function quote(txt){
    return `\\"${txt}\\"`
}


async function loadSchema(name){
    let data = await fs.promises.readFile(name, 'utf8')
    data =  data.toString()
    let lines = data.split("\n")
    let i = 0
    let line = lines[i]
    let header = ""
    while(line.startsWith("#include")){
      header = header + await loadSchema(path.join(path.dirname(name), line.substring(9).trim())) + "\n"
      i += 1
      line = lines[i]
    }
    return header + data
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function dgraph(config){
    return async function(){
        const url = `${config.url}:${config.port}/admin`
        const name = config.schema
        
        let data = ""
        try{
            if(name.endsWith(".js")) data = requireUncached(name)
            else data = await loadSchema(name)
        }catch(err){
            console.log('dgraph error', err)
            throw err
        }
        data = data + config.schemaFooter(config)
        const schema = data.toString()
        console.log(data)
        
        while(true){       
            let response = await axios({
                url,
                method: 'post',
                data: {
                    query: `mutation($schema: String!) {
                        updateGQLSchema(input: { set: { schema: $schema } }) {
                        gqlSchema {
                            schema
                        }
                        }
                    }`,
                    variables: {
                        schema,
                    },
                },
            })

            if(!response.data.errors){
                //break
                return 'ok';
            }

            console.log(response.data.errors)
            
            if(!response.data.errors[0].message.startsWith('failed to lazy-load GraphQL schema')){                
                throw new Error(response.data.errors[0].message)
            }
            await sleep(2000)
        }
    }
}

module.exports = {
    dgraph,
    quote,
    gql,
    dropData,
    loadSchema,
    client
}