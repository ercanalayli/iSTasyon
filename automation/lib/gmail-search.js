export async function searchMessages(gmail, q, maxResults = 10){
  const res = await gmail.users.messages.list({ userId:'me', q, maxResults });
  return res.data.messages || [];
}

export function mailboxQuery(mailbox, extra){
  // 2026-08-06: "to:" filtresi banka e-postalarinin cogunun gorunmez
  // olmasina sebep oluyordu - banka orijinal olarak alaylimedikal@gmail.com'a
  // gonderiyor, ercanalayli@gmail.com'a yonlendiriliyor; Gmail'in "to:"
  // operatoru orijinal To: basligina bakiyor, yonlendirmeyi gormuyor.
  // users.messages.list zaten userId:'me' ile bu kutuya sinirli - "to:"
  // kisitlamasina hic gerek yok, sadece zarar veriyordu.
  return extra;
}
