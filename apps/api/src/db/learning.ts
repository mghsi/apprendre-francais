import { createHash } from 'node:crypto'
import pg from 'pg'
import type { AiJob, AiJobRepository, AiOperation, Attempt, AttemptRepository, ClaimedJob, Json } from '../domain.js'
const fail=(message:string,statusCode:number,code:string)=>Object.assign(new Error(message),{statusCode,code})
const attempt=(r:any):Attempt=>({id:r.id,skill:r.skill,task:r.task,mode:r.mode,promptId:r.prompt_id,promptVersion:r.prompt_version,state:r.state,response:r.response,metadata:r.metadata,version:r.version,submittedAt:r.submitted_at,createdAt:r.created_at,updatedAt:r.updated_at})
const job=(r:any)=>({id:r.id,operation:r.operation,state:r.state,result:r.result,safeErrorCode:r.safe_error_code,promptVersion:r.prompt_version,provider:r.provider,model:r.model,createdAt:r.created_at,updatedAt:r.updated_at})
const kh=(s:string)=>createHash('sha256').update(s).digest('hex')
export class PostgresLearningRepository implements AttemptRepository,AiJobRepository {
  readonly pool:pg.Pool
  constructor(url:string){this.pool=new pg.Pool({connectionString:url,max:10,connectionTimeoutMillis:5000})}
  async list(u:string,c?:string,l=20){const n=Math.min(l,50);let date:string|null=null,id:string|null=null;if(c){const decoded=JSON.parse(Buffer.from(c,'base64url').toString('utf8')) as unknown;if(!Array.isArray(decoded)||decoded.length!==2||typeof decoded[0]!=='string'||typeof decoded[1]!=='string'||Number.isNaN(Date.parse(decoded[0])))throw fail('Invalid cursor',422,'INVALID_CURSOR');[date,id]=decoded}const r=await this.pool.query(`SELECT * FROM attempts WHERE user_id=$1 AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT $4`,[u,date,id,n+1]);const last=r.rows[n-1];return{items:r.rows.slice(0,n).map(attempt),nextCursor:r.rows.length>n?Buffer.from(JSON.stringify([last.created_at.toISOString(),last.id])).toString('base64url'):null}}
  async create(u:string,i:any,key:string){const client=await this.pool.connect();try{await client.query('BEGIN');const req=kh(JSON.stringify(i));const old=await client.query('SELECT request_hash,resource_id FROM idempotency_keys WHERE user_id=$1 AND scope=$2 AND key_hash=$3',[u,'attempt:create',kh(key)]);if(old.rows[0]){if(old.rows[0].request_hash!==req)throw fail('Idempotency key reused with different input',409,'IDEMPOTENCY_CONFLICT');const got=await client.query('SELECT * FROM attempts WHERE user_id=$1 AND id=$2',[u,old.rows[0].resource_id]);await client.query('COMMIT');return attempt(got.rows[0])}const r=await client.query('INSERT INTO attempts(user_id,skill,task,mode,prompt_id,prompt_version,response,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[u,i.skill,i.task,i.mode,i.promptId,i.promptVersion,i.response,i.metadata]);await client.query('INSERT INTO idempotency_keys(user_id,scope,key_hash,request_hash,resource_id) VALUES($1,$2,$3,$4,$5)',[u,'attempt:create',kh(key),req,r.rows[0].id]);await client.query('COMMIT');return attempt(r.rows[0])}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
  async get(u:string,id:string){const r=await this.pool.query('SELECT * FROM attempts WHERE user_id=$1 AND id=$2',[u,id]);return r.rows[0]?attempt(r.rows[0]):null}
  async update(u:string,id:string,v:number,response:Json,metadata:Json){const r=await this.pool.query("UPDATE attempts SET response=$4,metadata=$5,version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2 AND version=$3 AND state='draft' RETURNING *",[u,id,v,response,metadata]);if(r.rows[0])return attempt(r.rows[0]);const current=await this.get(u,id);if(!current)throw fail('Resource not found',404,'NOT_FOUND');if(current.state!=='draft')throw fail('Only drafts can be updated',409,'INVALID_STATE');throw fail('Attempt version conflict',409,'VERSION_CONFLICT')}
  async submit(u:string,id:string,key:string){const client=await this.pool.connect();try{await client.query('BEGIN');const k=kh(key);const old=await client.query('SELECT resource_id FROM idempotency_keys WHERE user_id=$1 AND scope=$2 AND key_hash=$3',[u,`attempt:submit:${id}`,k]);if(old.rows[0]){const r=await client.query('SELECT * FROM attempts WHERE user_id=$1 AND id=$2',[u,id]);await client.query('COMMIT');if(!r.rows[0])throw fail('Resource not found',404,'NOT_FOUND');return attempt(r.rows[0])}const r=await client.query("UPDATE attempts SET state='submitted',submitted_at=now(),version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2 AND state='draft' RETURNING *",[u,id]);if(!r.rows[0]){const x=await client.query('SELECT state FROM attempts WHERE user_id=$1 AND id=$2',[u,id]);throw x.rows[0]?fail('Attempt already submitted',409,'INVALID_STATE'):fail('Resource not found',404,'NOT_FOUND')}await client.query('INSERT INTO idempotency_keys(user_id,scope,key_hash,request_hash,resource_id) VALUES($1,$2,$3,$4,$5)',[u,`attempt:submit:${id}`,k,kh(id),id]);await client.query('COMMIT');return attempt(r.rows[0])}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
  async delete(u:string,id:string){return (await this.pool.query('DELETE FROM attempts WHERE user_id=$1 AND id=$2',[u,id])).rowCount===1}
  async countToday(u:string){return Number((await this.pool.query("SELECT count(*) n FROM ai_jobs WHERE user_id=$1 AND created_at>=date_trunc('day',now())",[u])).rows[0].n)}
  async enqueue(u:string,o:AiOperation,input:Json,hash:string,pv:string,provider:string,model:string,attemptId?:string):Promise<{job:AiJob;cached:boolean}>{if(o==='vocabulary'){const c=await this.pool.query('SELECT result FROM vocabulary_packs WHERE cache_key=$1 AND expires_at>now()',[hash]);if(c.rows[0])return{job:{id:'cached',operation:o,state:'completed' as const,result:c.rows[0].result,safeErrorCode:null,promptVersion:pv,provider,model,createdAt:new Date(),updatedAt:new Date()},cached:true}}const inserted=await this.pool.query(`INSERT INTO ai_jobs(user_id,attempt_id,operation,input,input_hash,prompt_version,provider,model) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,operation,input_hash,prompt_version) WHERE state IN ('queued','running') DO NOTHING RETURNING *`,[u,attemptId??null,o,input,hash,pv,provider,model]);if(inserted.rows[0])return{job:job(inserted.rows[0]),cached:false};const existing=await this.pool.query("SELECT * FROM ai_jobs WHERE user_id=$1 AND operation=$2 AND input_hash=$3 AND prompt_version=$4 AND state IN ('queued','running')",[u,o,hash,pv]);if(!existing.rows[0])throw fail('Concurrent enqueue conflict',409,'ENQUEUE_CONFLICT');return{job:job(existing.rows[0]),cached:false}}
  async getJob(u:string,id:string){const r=await this.pool.query('SELECT * FROM ai_jobs WHERE user_id=$1 AND id=$2',[u,id]);return r.rows[0]?job(r.rows[0]):null}
  async claim(){const c=await this.pool.connect();try{await c.query('BEGIN');await c.query("UPDATE ai_jobs SET state='queued',locked_at=NULL,available_at=now(),updated_at=now() WHERE state='running' AND locked_at<now()-interval '5 minutes'");const r=await c.query("SELECT * FROM ai_jobs WHERE state='queued' AND available_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1");if(!r.rows[0]){await c.query('COMMIT');return null}const x=await c.query("UPDATE ai_jobs SET state='running',attempts=attempts+1,locked_at=now(),updated_at=now() WHERE id=$1 RETURNING *",[r.rows[0].id]);await c.query('COMMIT');return {...job(x.rows[0]),userId:x.rows[0].user_id,attemptId:x.rows[0].attempt_id,input:x.rows[0].input,attempts:x.rows[0].attempts} as ClaimedJob}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
  async complete(id: string, result: Json, usage: Json = {}) {
    const completed = await this.pool.query(
      `UPDATE ai_jobs
       SET state = 'completed', result = $2, usage = $3, input = NULL,
           locked_at = NULL, updated_at = now()
       WHERE id = $1 AND state = 'running'
       RETURNING operation, attempt_id, input_hash, prompt_version, provider, model`,
      [id, result, usage],
    )
    const row = completed.rows[0]
    if (!row) return
    if (row.operation === 'evaluation' && row.attempt_id) {
      await this.pool.query(
        `UPDATE attempts
         SET state = 'evaluated', updated_at = now()
         WHERE id = $1 AND state = 'submitted'`,
        [row.attempt_id],
      )
    }
    if (row.operation === 'vocabulary') {
      await this.pool.query(
        `INSERT INTO vocabulary_packs
           (cache_key, theme, prompt_version, provider, model, result, expires_at)
         VALUES ($1, 'redacted', $2, $3, $4, $5, now() + interval '30 days')
         ON CONFLICT (cache_key) DO UPDATE
         SET result = $5, expires_at = EXCLUDED.expires_at`,
        [row.input_hash, row.prompt_version, row.provider, row.model, result],
      )
    }
  }
  async retryOrFail(id:string,retry:boolean,max:number,code:string,delay:number){await this.pool.query("UPDATE ai_jobs SET state=CASE WHEN $2 AND attempts<$3 THEN 'queued' ELSE 'failed' END,safe_error_code=CASE WHEN $2 AND attempts<$3 THEN NULL ELSE $4 END,input=CASE WHEN $2 AND attempts<$3 THEN input ELSE NULL END,locked_at=NULL,available_at=now()+($5||' milliseconds')::interval,updated_at=now() WHERE id=$1 AND state='running'",[id,retry,max,code,delay])}
  async close(){await this.pool.end()}
}
