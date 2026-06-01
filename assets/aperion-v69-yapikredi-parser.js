/* AperiON v69 Yapı Kredi Mail Ekstre Parser
   Akış: Gmail PDF text -> hareket satırları -> pending_bank_movements JSON -> mükerrer key.
   Bu dosya mevcut v68 onay merkezini bozmaz; sadece parser/pending veri üretir.
*/
(function(){
  function clean(s){return String(s||'').replace(/\r/g,'\n').replace(/\u00a0/g,' ').replace(/￾/g,' ').replace(/&#40;/g,'(').replace(/&#41;/g,')').replace(/[ \t]+/g,' ').trim();}
  function trUpper(s){return clean(s).toLocaleUpperCase('tr-TR');}
  function moneyToNumber(s){
    var raw=clean(s).replace(/TL/g,'').replace(/\./g,'').replace(',', '.');
    var n=Number(raw);
    return Number.isFinite(n)?n:0;
  }
  function isoDate(d){
    var m=String(d||'').match(/(\d{2})\.(\d{2})\.(\d{4})/);
    return m ? (m[3]+'-'+m[2]+'-'+m[1]) : '';
  }
  function stableKey(s){
    return trUpper(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,160);
  }
  function detectType(desc, amount){
    var u=trUpper(desc);
    if(u.indexOf('MOKA')>=0 || u.indexOf('POS')>=0 || u.indexOf('ÜYE İŞYERİ')>=0 || u.indexOf('UYE ISYERI')>=0 || u.indexOf('PEŞİN SATIŞ')>=0 || u.indexOf('PESIN SATIS')>=0) return 'moka_pos';
    if(u.indexOf('GELEN FAST')>=0 || u.indexOf('GELEN EFT')>=0 || u.indexOf('GELEN HAVALE')>=0) return 'tahsilat';
    if(u.indexOf('GİDEN FAST')>=0 || u.indexOf('GIDEN FAST')>=0 || u.indexOf('GİDEN EFT')>=0 || u.indexOf('GIDEN EFT')>=0) return 'odeme';
    if(u.indexOf('VİRMAN')>=0 || u.indexOf('VIRMAN')>=0) return 'virman';
    if(u.indexOf('SGK')>=0) return 'sgk';
    if(u.indexOf('HGS')>=0) return 'hgs';
    if(u.indexOf('BSMV')>=0 || u.indexOf('ÜCRET')>=0 || u.indexOf('UCRET')>=0 || u.indexOf('KATKI PAYI')>=0) return 'banka_masrafi';
    return amount>=0 ? 'tahsilat' : 'odeme';
  }
  function confidenceFor(desc,type){
    var u=trUpper(desc), score=55;
    if(type==='moka_pos') score=92;
    if(type==='tahsilat'||type==='odeme') score=82;
    if(type==='virman'||type==='sgk'||type==='hgs'||type==='banka_masrafi') score=90;
    if(u.length>35) score+=5;
    return Math.min(99,score);
  }
  function extractPeriod(text){
    var dates=(clean(text).match(/\d{2}\.\d{2}\.\d{4}/g)||[]).filter(Boolean);
    return {start: isoDate(dates[0]||''), end: isoDate(dates[dates.length-1]||'')};
  }
  function extractStatementId(subject, attachment){
    var s=String(subject||'')+' '+String(attachment||'');
    var m=s.match(/(20\d{6})[_-]?(\d{6,})/);
    return m ? (m[1]+'_'+m[2]) : stableKey(s).slice(0,80);
  }
  function parseYapiKrediText(text, meta){
    meta=meta||{};
    var sourceText=clean(text);
    var statementId=extractStatementId(meta.mail_subject, meta.attachment_name);
    var period=extractPeriod(sourceText);
    var lines=sourceText.split('\n').map(clean).filter(Boolean);
    var headerRe=/^(\d{2}\.\d{2}\.\d{4})(?:\s+(\d{2}\.\d{2}\.\d{4}))?\s+(.+)$/;
    var moneyRe=/(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+TL\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+TL/;
    var rows=[];
    var cur=null;
    function flush(){
      if(!cur) return;
      var joined=clean(cur.parts.join(' '));
      var mm=joined.match(moneyRe);
      if(!mm) return;
      var amount=moneyToNumber(mm[1]);
      var balance=moneyToNumber(mm[2]);
      var desc=clean(joined.replace(moneyRe,'').replace(cur.date,'').replace(cur.valueDate||'',''));
      if(!desc || desc.indexOf('AÇILIŞ')>=0 || desc.indexOf('KAPANIŞ')>=0) return;
      var type=detectType(desc,amount);
      var tx={
        company_id: meta.company_id || 'alayli',
        source: 'gmail_bank_statement',
        bank_name: 'Yapı Kredi',
        account_name: meta.account_name || 'ALAYLI MEDİKAL Yapı Kredi TL',
        iban_or_account_no: meta.iban_or_account_no || 'TR500006701000000077455056',
        mail_subject: meta.mail_subject || '',
        mail_from: meta.mail_from || '',
        mail_date: meta.mail_date || '',
        attachment_name: meta.attachment_name || '',
        statement_id: statementId,
        statement_period: (period.start&&period.end)?(period.start+' / '+period.end):'',
        transaction_date: isoDate(cur.date),
        value_date: isoDate(cur.valueDate || cur.date),
        description: desc,
        amount_in: amount>0 ? amount : 0,
        amount_out: amount<0 ? Math.abs(amount) : 0,
        balance_after: balance,
        raw_text: joined,
        detected_type: type,
        suggested_counterparty: suggestCounterparty(desc,type),
        confidence_score: confidenceFor(desc,type),
        status: 'pending',
        duplicate_key: '',
        created_at: new Date().toISOString()
      };
      tx.duplicate_key = makeDuplicateKey(tx);
      rows.push(tx);
    }
    for(var i=0;i<lines.length;i++){
      var line=lines[i];
      var h=line.match(headerRe);
      if(h){
        flush();
        cur={date:h[1],valueDate:h[2]||h[1],parts:[line]};
      }else if(cur){
        cur.parts.push(line);
      }
    }
    flush();
    return rows;
  }
  function suggestCounterparty(desc,type){
    var u=trUpper(desc);
    if(type==='moka_pos') return 'Moka / POS';
    if(u.indexOf('VAKIFBANK')>=0) return 'Vakıfbank';
    if(u.indexOf('İŞ BANK')>=0 || u.indexOf('IS BANK')>=0) return 'İş Bankası';
    if(u.indexOf('AKBANK')>=0) return 'Akbank';
    if(u.indexOf('SGK')>=0) return 'SGK';
    if(u.indexOf('HGS')>=0) return 'HGS';
    var m=clean(desc).match(/(?:GELEN|GİDEN|GIDEN)\s+(?:FAST|EFT|HAVALE)\s*-\s*([^\-]{3,60})/i);
    return m ? clean(m[1]) : '';
  }
  function makeDuplicateKey(tx){
    return ['YAPIKREDI',tx.statement_id,tx.transaction_date,(tx.amount_in||0).toFixed(2),(tx.amount_out||0).toFixed(2),(tx.balance_after||0).toFixed(2),stableKey(tx.description)].join('|');
  }
  function toPendingPayload(text, meta){
    var rows=parseYapiKrediText(text, meta);
    var seen={};
    rows.forEach(function(r){
      if(seen[r.duplicate_key]) r.status='duplicate_candidate';
      seen[r.duplicate_key]=true;
    });
    return {
      bank:'Yapı Kredi',
      source:'gmail_bank_statement',
      pending_count: rows.filter(function(r){return r.status==='pending';}).length,
      duplicate_count: rows.filter(function(r){return r.status==='duplicate_candidate';}).length,
      rows: rows
    };
  }
  window.AperiONYapiKrediParser={parseYapiKrediText:parseYapiKrediText,toPendingPayload:toPendingPayload,makeDuplicateKey:makeDuplicateKey};
})();
