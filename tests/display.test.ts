import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanSnapshot} from '../scripts/display/protocol';
test('display payload excludes private class, attendance, history and outcome data',()=>{
 const result=cleanSnapshot({mode:'name',name:'Aroha M',avatar:'🙂',classId:'private',students:[{firstName:'Private'}],attendance:['private'],history:[{outcome:'not_yet'}],outcome:'partial',notes:'Private note',progress:{round:1,picked:2,total:8}});
 assert.deepEqual(result,{mode:'name',name:'Aroha M',avatar:'🙂',progress:{round:1,picked:2,total:8}});
});
test('thinking timer does not leak the previously selected student',()=>{
 const result=cleanSnapshot({mode:'timer',name:'Previous student',phase:'think',prompt:'Explain your reasoning',endsAt:Date.now()+5000,notes:'Private'});
 assert.equal('name' in result,false);assert.equal('notes' in result,false);assert.equal(result.phase,'think');
});
test('invalid display states and progress are rejected and text is bounded',()=>{
 assert.deepEqual(cleanSnapshot({mode:'history',notes:'Private'}),{mode:'idle'});
 assert.equal(cleanSnapshot({mode:'name',name:'x'.repeat(1000)}).name?.length,70);
 assert.equal(cleanSnapshot({mode:'idle',progress:{round:1,picked:20,total:5}}).progress,undefined);
 assert.deepEqual(cleanSnapshot(null),{mode:'idle'});
});

test('follow-up prompt is included without the private outcome',()=>{assert.deepEqual(cleanSnapshot({mode:'name',name:'Aroha M',avatar:'🙂',prompt:'What evidence supports your answer?',outcome:'partial'}),{mode:'name',name:'Aroha M',avatar:'🙂',prompt:'What evidence supports your answer?'});});
