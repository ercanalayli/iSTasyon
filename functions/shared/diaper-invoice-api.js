/**
 * Hasta Bezi A1 -> BizimHesap B2B /addinvoice proposal.
 * This module NEVER posts or creates invoices. Every line must be resolved
 * to exactly one verified BizimHesap product and an approved package ratio.
 * An image/text extraction or a previous A1 price list is not sufficient.
 */
const cents = value => Math.round(Number(value) * 100);
const cash = centsValue => (centsValue / 100).toFixed(2);
const id = text => /^[0-9a-f]{32}$/i.test(String(text || ''));
const nonnegativeInt = n => Number.isSafeInteger(n) && n >= 0;
const issue = (blockers, code) => { if (!blockers.includes(code)) blockers.push(code); };
const number = value => Number.isFinite(value) ? value : Number(value);
export function prepareDiaperInvoice(order = {}) {
  const blockers = [];
  const sourceId = String(order.sourceId || '').trim();
  if (!sourceId || sourceId.length > 120) issue(blockers, 'source_id_required');
  if (order.imageParsedAndReviewed !== true) issue(blockers, 'source_image_not_reviewed');
  if (order.uniqueSourceConfirmed !== true) issue(blockers, 'duplicate_check_required');
  if (order.customerMatchVerified !== true || !id(order.bizimhesapCustomerId))
    issue(blockers, 'exact_customer_match_required');
  if (!String(order.customerTitle || '').trim()) issue(blockers, 'customer_title_required');
  if (order.deliveryAndInvoicePolicyConfirmed !== true) issue(blockers, 'invoice_vs_proforma_policy_required');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(String(order.invoiceDate || '')))
    issue(blockers, 'invoice_datetime_required');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(String(order.dueDate || '')))
    issue(blockers, 'invoice_due_datetime_required');
  if (order.shippingDecision !== 'not_included' && order.shippingDecision !== 'approved_separate_line')
    issue(blockers, 'shipping_charge_decision_required');
  if (order.shippingDecision === 'approved_separate_line')
    issue(blockers, 'shipping_line_requires_separate_approved_sku');
  if (!Array.isArray(order.items) || !order.items.length) issue(blockers, 'items_required');
  const seen = new Set();
  const items = [];
  for (const [i, raw] of (order.items || []).entries()) {
    const prefix = 'line_' + (i + 1);
    const sku = String(raw.sku || '').trim();
    if (!sku || seen.has(sku)) issue(blockers, prefix + '_sku_missing_or_repeated');
    seen.add(sku);
    if (!id(raw.bizimhesapProductId) || raw.productMatchVerified !== true)
      issue(blockers, prefix + '_exact_product_match_required');
    if (!String(raw.productTitle || '').trim()) issue(blockers, prefix + '_product_title_required');
    // Neither four packages/bale nor thirty units/package may be assumed.
    const ratio = number(raw.packagesPerBale), unitSize = number(raw.unitsPerPackage);
    if (raw.packageRatioVerified !== true || !Number.isInteger(ratio) || ratio <= 0 ||
        !Number.isInteger(unitSize) || unitSize <= 0)
      issue(blockers, prefix + '_package_master_required');
    const bales = raw.bales == null ? 0 : number(raw.bales);
    const openPackages = raw.openPackages == null ? 0 : number(raw.openPackages);
    const packageQuantity = raw.packages == null ? null : number(raw.packages);
    if (!nonnegativeInt(bales) || !nonnegativeInt(openPackages) ||
        (packageQuantity !== null && (!nonnegativeInt(packageQuantity) || bales || openPackages)))
      issue(blockers, prefix + '_quantity_ambiguous');
    const packs = packageQuantity !== null ? packageQuantity : bales * ratio + openPackages;
    if (!Number.isSafeInteger(packs) || packs <= 0)
      issue(blockers, prefix + '_package_quantity_invalid');
    const unitMode = String(raw.bizimhesapUnit || '').toLocaleLowerCase('tr-TR');
    if (!['paket', 'adet'].includes(unitMode)) issue(blockers, prefix + '_invoice_unit_not_verified');
    const invoiceQuantity = unitMode === 'adet' ? packs * unitSize : packs;
    const price = number(raw.approvedPriceExVatPerInvoiceUnit);
    const vatRate = number(raw.approvedVatRate);
    if (raw.priceAndVatApproved !== true || !Number.isFinite(price) || price <= 0 ||
        !Number.isFinite(vatRate) || ![0, 1, 10, 20].includes(vatRate))
      issue(blockers, prefix + '_price_or_vat_unapproved');
    // Quantities and money use integer kurus; avoid floating point drift.
    const netKurus = Math.round(invoiceQuantity * price * 100);
    const taxKurus = Math.round(netKurus * vatRate / 100);
    if (!Number.isSafeInteger(netKurus) || netKurus <= 0)
      issue(blockers, prefix + '_net_invalid');
    items.push({
      sku, productId: String(raw.bizimhesapProductId || ''), productName: raw.productTitle,
      packages: packs, units: packs * unitSize, invoiceUnit: unitMode,
      quantity: invoiceQuantity, unitPrice: Number.isFinite(price) ? price.toFixed(2) : null,
      taxRate: vatRate, netKurus, taxKurus, totalKurus: netKurus + taxKurus
    });
  }
  if (blockers.length) return {
    status:'BLOCKED_REVIEW',sourceId,blockers,items,financialWrites:0,approvalRequired:true
  };
  const netKurus = items.reduce((t,x)=>t+x.netKurus,0);
  const taxKurus = items.reduce((t,x)=>t+x.taxKurus,0);
  const totalKurus = netKurus + taxKurus;
  const payload = {
    invoiceType:3, invoiceNo:'',
    note:'APERION HASTA BEZI SIPARIS '+sourceId+' | API ONAYLI | sevk ayrica dogrulanacak',
    dates:{invoiceDate:order.invoiceDate,deliveryDate:order.invoiceDate,dueDate:order.dueDate},
    customer:{customerId:order.bizimhesapCustomerId,title:order.customerTitle},
    amounts:{currency:'TL',gross:cash(netKurus),discount:'0.00',net:cash(netKurus),tax:cash(taxKurus),total:cash(totalKurus)},
    details:items.map(x=>({
      productId:x.productId,productName:x.productName,quantity:x.quantity,
      unitPrice:x.unitPrice,grossPrice:cash(x.netKurus),discount:'0.00',
      net:cash(x.netKurus),taxRate:x.taxRate.toFixed(2),
      tax:cash(x.taxKurus),total:cash(x.totalKurus)
    }))
  };
  return {
    status:'READY_FOR_EXPLICIT_APPROVAL',sourceId,customer:order.customerTitle,
    itemCount:items.length,net:cash(netKurus),tax:cash(taxKurus),total:cash(totalKurus),
    items,apiPayload:payload,
    financialWrites:0,approvalRequired:true,
    prePostingChecks:['firm_id_verified','source_immutable','duplicate_search','stock_check','approval_command_id','invoice_readback']
  };
}
