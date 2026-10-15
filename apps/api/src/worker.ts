import 'dotenv/config'
import { createProvider, processOperation, ProviderError } from './ai/gateway.js'
import { loadConfig } from './config.js'
import { PostgresLearningRepository } from './db/learning.js'
const config=loadConfig(),repo=new PostgresLearningRepository(config.DATABASE_URL),provider=createProvider(config)
let stop=false;process.once('SIGTERM',()=>{stop=true});process.once('SIGINT',()=>{stop=true})
while(!stop){const j=await repo.claim();if(!j){await new Promise(r=>setTimeout(r,500));continue}try{const x=await processOperation(j.operation,j.input,provider,config.AI_TIMEOUT_MS);await repo.complete(j.id,x.result,x.usage)}catch(e){const transient=e instanceof ProviderError&&e.transient;const validation=typeof e==='object'&&e!==null&&'validation' in e;await repo.retryOrFail(j.id,transient,config.AI_MAX_ATTEMPTS,validation?'INVALID_PROVIDER_OUTPUT':transient?'PROVIDER_UNAVAILABLE':'PROCESSING_FAILED',Math.min(30000,1000*2**j.attempts+Math.floor(Math.random()*500)))}}
await repo.close()
