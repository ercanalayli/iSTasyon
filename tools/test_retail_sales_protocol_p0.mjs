import assert from "node:assert/strict";
import {
  RETAIL_TEST_V1, retailCommand, validateRetailExecutionEvidence, handleRetailTelegramCommand
} from "../functions/shared/retail-sales-protocol.js";

assert.equal(retailCommand("/satistest"), "stage_test");
assert.equal(retailCommand("/satistest 6 TL"), "stage_test");
assert.equal(retailCommand("/satisdurum"), "status");
assert.equal(retailCommand("6 TL satis"), null);
assert.equal(retailCommand("/satistest 600 TL"), null);
assert.equal(RETAIL_TEST_V1.amountMinor, 600);
assert.equal(RETAIL_TEST_V1.cash.code, "NAKIT");
assert.equal(RETAIL_TEST_V1.cash.sourceGuid, "389916FD16984267B4F61251BC182525");
assert.equal(RETAIL_TEST_V1.eInvoice, false);
assert.equal(RETAIL_TEST_V1.taxMinor + RETAIL_TEST_V1.taxableMinor, RETAIL_TEST_V1.amountMinor);
assert.equal(validateRetailExecutionEvidence({saleGuid:"G",amountMinor:600,recordVerified:true,customerType:"retail"}).complete,false);
assert.equal(validateRetailExecutionEvidence({
  saleGuid:"G",amountMinor:600,recordVerified:true,customerType:"retail",
  cashGuid:RETAIL_TEST_V1.cash.sourceGuid,cashReceiptMinor:600,cashReceiptVerified:true,cashEntryGuid:"C"
}).complete,true);
assert.equal(validateRetailExecutionEvidence({
  saleGuid:"G",amountMinor:600,recordVerified:true,customerType:"retail",
  cashGuid:"wrong",cashReceiptMinor:600,cashReceiptVerified:true,cashEntryGuid:"C"
}).complete,false);

function fakeD1() {
  const rows=new Map();
  return {
    rows,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              if (sql.startsWith("SELECT id,status")) return rows.get(params[0]) || null;
              throw new Error("Unexpected SELECT");
            },
            async run() {
              if (!sql.startsWith("INSERT INTO approval_queue")) throw new Error("Unexpected write");
              const [id,payload_json,evidence_ref,key]=params;
              if(rows.has(key))throw new Error("Duplicate key");
              rows.set(key,{id,status:"blocked_adapter",payload_json,evidence_ref});
              return {success:true};
            }
          };
        }
      };
    }
  };
}
const db=fakeD1(), messages=[];
const ctx = {
  env:{APERION_DB:db},
  identity:{hardened:true},
  sendMessage: async (_env,id,text)=>{messages.push({id,text});return {ok:true}}
};
const draft=await handleRetailTelegramCommand({...ctx,message:{text:"/satistest",chat:{id:1234},message_id:567}});
assert.equal(draft.status,"blocked_adapter");
assert.equal(draft.financialWrites,0);
assert.ok(draft.recordId);
assert.equal(db.rows.size,1);
assert.match(messages[0].text,/Satışlar|satış|Satış/);
assert.match(messages[0].text,/doğrulanmadı/);

const duplicate=await handleRetailTelegramCommand({...ctx,message:{text:"/satistest",chat:{id:1234},message_id:568}});
assert.equal(duplicate.duplicate,true);
assert.equal(duplicate.recordId,draft.recordId);
assert.equal(db.rows.size,1);

const status=await handleRetailTelegramCommand({...ctx,message:{text:"/satisdurum",chat:{id:1234},message_id:569}});
assert.equal(status.handled,true);
assert.equal(status.financialWrites,0);
assert.equal(db.rows.size,1);

const blocked=await handleRetailTelegramCommand({...ctx,identity:{hardened:false},message:{text:"/satistest",chat:{id:1234},message_id:570}});
assert.equal(blocked.status,"identity_blocked");
assert.equal(db.rows.size,1);

console.log("APERION_RETAIL_P0_PROTOCOL_TEST_PASS; ERP_WRITES=0; CASH_WRITES=0");
