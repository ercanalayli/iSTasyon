// Independent-process Memory OS acceptance for the user-confirmed document rule.
import { memoryRequest } from './lib/memory_transport.mjs';

const question = 'ALAYLI MEDİKAL ödeme makbuzu fotoğrafı BizimHesap kaydına nasıl eklenir?';
const recall = await memoryRequest(`/v1/recall?q=${encodeURIComponent(question)}`);
const facts = await memoryRequest(`/v1/memory?view=facts&subject=${encodeURIComponent('ALAYLI MEDİKAL')}`);
const relevant = (facts.rows || []).filter(row => /ek|belge|makbuz|foto/i.test(`${row.predicate} ${row.object_value}`));
console.log(JSON.stringify({ question, recallFound:recall.found, recallAnswer:recall.answer || null,
  recallProvenanceCount:recall.provenance?.length || 0, relevantFacts:relevant.map(row => ({subject:row.subject,predicate:row.predicate,value:row.object_value,authority:row.authority,status:row.status})) }));
