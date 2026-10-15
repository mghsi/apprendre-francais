import { describe,expect,it,vi } from 'vitest'
import { normalizeCorrection, normalizeEvaluation, normalizeVocab, processOperation } from '../src/ai/gateway.js'

describe('provider output normalization',()=>{
  it('drops unanchored and overlapping correction entries',()=>{
    const result=normalizeCorrection({errors:[{original:'suis',corrected:'suis',explanation:'x',type:'x'},{original:'absent',corrected:'x'}],suggestions:new Array(7).fill({original:'',suggested:'x',explanation:'x'}),fully_corrected:'Je suis'},'Je suis')
    expect(result.errors).toHaveLength(1);expect(result.suggestions).toHaveLength(5)
  })
  it('normalizes evaluation enums and vocabulary fields',()=>{
    expect(normalizeEvaluation({task_fulfillment:{status:'invented'}},'texte').taskFulfillment.status).toBe('partial')
    expect(normalizeVocab({nouns:[{term:'  enjeu ',definition:'d'}]},'thème').nouns[0]).toMatchObject({term:'enjeu'})
  })
  it('rejects malformed provider JSON without exposing it',async()=>{
    await expect(processOperation('correction',{text:'bonjour'},vi.fn(async()=>({text:'secret malformed'})),1000)).rejects.toMatchObject({validation:true})
  })
})
