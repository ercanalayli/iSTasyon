/* AperiON v69 Yapı Kredi Mail Ekstre Parser
   Akış: Gmail PDF text -> hareket satırları -> pending_bank_movements JSON -> mükerrer key.
   Desteklenen formatlar:
   1) Hesap Özeti: Tarih Valör Tarihi Açıklama İşlem Tutarı Güncel Bakiye
   2) Hesap Hareketleri: Tarih Saat İşlem Kanal Açıklama İşlem Tutarı Bakiye
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
    var m=String(d||'').match(/(\d{2})[\.\/](\d{2})[\.\/](\d{4})/);
    return m ? (m[3]+'-'+m[2]+'-'+m[1]) : '';
  }
  function stableKey(s){
    return trUpper(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,160);
  }
  function detectType(desc, amount){
    var u=trUpper(desc);
    if(u.indexOf('MOKA')>=0 || u.indexOf('POS')>=0 || u.indexOf('ÜYE İŞYERİ')>=0 || u.indexOf('UYE ISYERI')>=0 || u.indexOf('PEŞİN SATIŞ')>=0 || u.indexOf('PESIN SATIS')>=0 || u.indexOf('PESINSATIS')>=0) return 'moka_pos';
    if(u.indexOf('GELEN FAST')>=0 || u.indexOf('GELEN EFT')>=0 || u.indexOf('GELEN HAVALE')>=0) return 'tahsilat';
    if(u.indexOf('GİDEN FAST')>=0 || u.indexOf('GIDEN FAST')>=0 || u.indexOf('GİDEN EFT')>=0 || u.indexOf('GIDEN EFT')>=0) return 'odeme';
    if(u.indexOf('VİRMAN')>=0 || u.indexOf('VIRMAN')>=0) return 'virman';
    if(u.indexOf('SGK')>=0) return 'sgk';
    if(u.indexOf('HGS')>=0) return 'hgs';
    if(u.indexOf('BSMV')>=0 || u.indexOf('ÜCRET')>=0 || u.indexOf('UCRET')>=0 || u.indexOf('KATKI PAYI')>=0) return 'banka_masrafi';
    if(u.indexOf('FATURA')>=0 || u.indexOf('TELEKOM')>=0) return 'fatura_odeme';
    return amount>=0 ? 'tahsilat' : 'odeme';
  }
  function confidenceFor(desc,type){
    var u=trUpper(desc), score=55;
    if(type==='moka_pos') score=92;
    if(type==='tahsilat'||type==='odeme') score=82;
    if(type==='virman'||type==='sgk'||type==='hgs'||type==='banka_masrafi'||type==='fatura_odeme') score=90;
    if(u.length>35) score+=5;
    return Math.min(99,score);
  }
  function extractPeriod(text){
    var c=clean(text);
    var ar=c.match(/Tarih Aralığı\s*:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);
    if(ar) return {start:isoDate(ar[1]),end:isoDate(ar[2])};
    var dates=(c.match(/\d{2}[\.\/]\d{2}[\.\/]\d{4}/g)||[]).filter(Boolean);
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
    if(sourceText.indexOf('Tarih Saat İşlem Kanal Açıklama')>=0 || sourceText.indexOf('Tarih Saat Islem Kanal')>=0) return parseHesapHareketleri(sourceText,meta);
    return parseHesapOzeti(sourceText,meta);
  }
  function baseTx(meta,statementId,period,cur,amount,balance,desc,joined){
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
      transaction_time: cur.time || '',
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
    return tx;
  }
  function parseHesapOzeti(sourceText, meta){
    var statementId=extractStatementId(meta.mail_subject, meta.attachment_name);
    var period=extractPeriod(sourceText);
    var lines=sourceText.split('\n').map(clean).filter(Boolean);
    var headerRe=/^(\d{2}\.\d{2}\.\d{4})(?:\s+(\d{2}\.\d{2}\.\d{4}))?\s+(.+)$/;
    var moneyRe=/(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+TL\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+TL/;
    var rows=[],cur=null;
    function flush(){
      if(!cur) return;
      var joined=clean(cur.parts.join(' '));
      var mm=joined.match(moneyRe);
      if(!mm) return;
      var amount=moneyToNumber(mm[1]), balance=moneyToNumber(mm[2]);
      var desc=clean(joined.replace(moneyRe,'').replace(cur.date,'').replace(cur.valueDate||'',''));
      if(!desc || desc.indexOf('AÇILIŞ')>=0 || desc.indexOf('KAPANIŞ')>=0) return;
      rows.push(baseTx(meta,statementId,period,cur,amount,balance,desc,joined));
    }
    lines.forEach(function(line){
      var h=line.match(headerRe);
      if(h){flush();cur={date:h[1],valueDate:h[2]||h[1],time:'',parts:[line]};}
      else if(cur){cur.parts.push(line);}
    });
    flush();
    return rows;
  }
  function parseHesapHareketleri(sourceText, meta){
    var statementId=extractStatementId(meta.mail_subject, meta.attachment_name);
    var period=extractPeriod(sourceText);
    var lines=sourceText.split('\n').map(clean).filter(Boolean);
    var headerRe=/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})\s+(.+)$/;
    var moneyRe=/(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+TL\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+TL/;
    var rows=[],cur=null;
    function flush(){
      if(!cur) return;
      var joined=clean(cur.parts.join(' '));
      if(joined.indexOf('Bekleyen İşlemler')>=0) return;
      var mm=joined.match(moneyRe);
      if(!mm) return;
      var amount=moneyToNumber(mm[1]), balance=moneyToNumber(mm[2]);
      var desc=clean(joined.replace(moneyRe,'').replace(cur.date,'').replace(cur.time,'').replace(/^(Para Gönder|Fatura Ödemesi|Diğer|Kart|POS)\s+/i,'').replace(/^(Internet - Mobil|Diğer)\s+/i,''));
      if(!desc) return;
      rows.push(baseTx(meta,statementId,period,cur,amount,balance,desc,joined));
    }
    lines.forEach(function(line){
      var h=line.match(headerRe);
      if(h){flush();cur={date:h[1],valueDate:h[1],time:h[2],parts:[line]};}
      else if(cur){cur.parts.push(line);}
    });
    flush();
    return rows;
  }
  function suggestCounterparty(desc,type){
    var u=trUpper(desc);
    if(type==='moka_pos') return 'Moka / POS';
    if(u.indexOf('VAKIFBANK')>=0) return 'Vakıfbank';
    if(u.indexOf('İŞ BANK')>=0 || u.indexOf('ISBANK')>=0 || u.indexOf('IS BANK')>=0) return 'İş Bankası';
    if(u.indexOf('AKBANK')>=0) return 'Akbank';
    if(u.indexOf('SGK')>=0) return 'SGK';
    if(u.indexOf('HGS')>=0) return 'HGS';
    if(u.indexOf('TELEKOM')>=0) return 'Türk Telekom';
    var m=clean(desc).match(/(?:GELEN|GİDEN|GIDEN)\s+(?:FAST|EFT|HAVALE)\s*-\s*([^\-]{3,60})/i);
    return m ? clean(m[1]) : '';
  }
  function makeDuplicateKey(tx){
    return ['YAPIKREDI',tx.statement_id,tx.transaction_date,tx.transaction_time||'',(tx.amount_in||0).toFixed(2),(tx.amount_out||0).toFixed(2),(tx.balance_after||0).toFixed(2),stableKey(tx.description)].join('|');
  }
  function toPendingPayload(text, meta){
    var rows=parseYapiKrediText(text, meta);
    var seen={};
    rows.forEach(function(r){if(seen[r.duplicate_key]) r.status='duplicate_candidate';seen[r.duplicate_key]=true;});
    return {bank:'Yapı Kredi',source:'gmail_bank_statement',pending_count:rows.filter(function(r){return r.status==='pending';}).length,duplicate_count:rows.filter(function(r){return r.status==='duplicate_candidate';}).length,rows:rows};
  }
  window.AperiONYapiKrediParser={parseYapiKrediText:parseYapiKrediText,toPendingPayload:toPendingPayload,makeDuplicateKey:makeDuplicateKey};
})();
