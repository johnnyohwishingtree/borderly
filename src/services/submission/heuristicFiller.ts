/**
 * HeuristicFiller — 1Password-style runtime DOM auto-fill.
 *
 * Instead of per-country CSS selectors, this scans the live DOM for
 * <input>, <select>, and <textarea> elements, reads their attributes
 * (name, id, placeholder, autocomplete, associated label text), and
 * matches them to profile data using fuzzy pattern matching.
 *
 * Works on ANY government portal without per-country maintenance.
 */

import type { TravelerProfile } from '@/types/profile';
import type { TripLeg } from '@/types/trip';
import { getCountryName } from '@/constants/countries';

/**
 * Flatten profile + leg into a key-value map of fillable data.
 * Keys are semantic names, values are strings ready for DOM insertion.
 */
export function buildFillData(
  profile: TravelerProfile,
  leg?: TripLeg,
): Record<string, string> {
  const data: Record<string, string> = {};

  // Passport / identity
  if (profile.passportNumber) data.passportNumber = profile.passportNumber;
  if (profile.surname) data.surname = profile.surname;
  if (profile.givenNames) {
    data.givenNames = profile.givenNames;
    data.fullName = `${profile.givenNames} ${profile.surname}`;
    const nameParts = profile.givenNames.split(' ');
    data.firstName = nameParts[0];
    if (nameParts.length > 1) data.middleName = nameParts.slice(1).join(' ');
  }
  if (profile.nationality) {
    data.nationality = profile.nationality;
    data.nationalityName = getCountryName(profile.nationality) || profile.nationality;
  }
  if (profile.dateOfBirth) {
    data.dateOfBirth = profile.dateOfBirth;
    const [dobY, dobM, dobD] = profile.dateOfBirth.split('-');
    if (dobY) data.birthYear = dobY;
    if (dobM) data.birthMonth = String(parseInt(dobM, 10));
    if (dobD) data.birthDay = String(parseInt(dobD, 10));
  }
  if (profile.gender) {
    data.gender = profile.gender;
    const genderMap: Record<string, string> = { M: 'Male', F: 'Female', X: 'Other' };
    data.genderDisplay = genderMap[profile.gender] || profile.gender;
  }
  if (profile.passportExpiry) {
    data.passportExpiry = profile.passportExpiry;
    const [expY, expM, expD] = profile.passportExpiry.split('-');
    if (expY) data.expiryYear = expY;
    if (expM) data.expiryMonth = String(parseInt(expM, 10));
    if (expD) data.expiryDay = String(parseInt(expD, 10));
  }
  if (profile.issuingCountry) {
    data.issuingCountry = profile.issuingCountry;
    data.issuingCountryName = getCountryName(profile.issuingCountry) || profile.issuingCountry;
  }

  // Contact
  if (profile.email) data.email = profile.email;
  if (profile.phoneNumber) data.phoneNumber = profile.phoneNumber;

  // Personal
  if (profile.occupation) data.occupation = profile.occupation;
  if (profile.maritalStatus) data.maritalStatus = profile.maritalStatus;
  if (profile.purposeOfVisit) data.purposeOfVisit = profile.purposeOfVisit;

  // Address
  if (profile.homeAddress) {
    const addr = profile.homeAddress;
    if (addr.line1) data.addressLine1 = addr.line1;
    if (addr.line2) data.addressLine2 = addr.line2;
    if (addr.city) data.city = addr.city;
    if (addr.state) data.state = addr.state;
    if (addr.postalCode) data.postalCode = addr.postalCode;
    if (addr.country) {
      data.addressCountry = addr.country;
      data.addressCountryName = getCountryName(addr.country) || addr.country;
    }
  }

  // Trip leg data
  if (leg) {
    if (leg.arrivalDate) data.arrivalDate = leg.arrivalDate;
    if (leg.departureDate) data.departureDate = leg.departureDate;
    if (leg.flightNumber) data.flightNumber = leg.flightNumber;
    if (leg.airlineCode) data.airlineCode = leg.airlineCode;
    if (leg.accommodation?.name) data.accommodationName = leg.accommodation.name;
    if (leg.accommodation?.address) {
      const a = leg.accommodation.address;
      if (a.line1) data.accommodationAddress = a.line1;
      if (a.city) data.accommodationCity = a.city;
      if (a.postalCode) data.accommodationPostalCode = a.postalCode;
    }
  }

  return data;
}

/**
 * The field matching rules. Each entry maps a profile data key to
 * patterns that might appear in a form element's attributes or label.
 *
 * Order matters — first match wins. More specific patterns go first.
 */
const FIELD_PATTERNS: Array<{
  profileKey: string;
  patterns: RegExp;
  inputType?: 'text' | 'select' | 'date';
}> = [
  // Passport
  { profileKey: 'passportNumber', patterns: /passport.?(no|num|number)|passport$/i },
  { profileKey: 'passportExpiry', patterns: /passport.?(exp|expir)|expir.?(date|y)/i, inputType: 'date' },
  { profileKey: 'issuingCountryName', patterns: /issu.?(country|state|by)|country.?issue/i, inputType: 'select' },

  // Name — specific patterns before generic
  { profileKey: 'surname', patterns: /surname|family.?name|last.?name/i },
  { profileKey: 'givenNames', patterns: /given.?name|first.?name|fore.?name/i },
  { profileKey: 'middleName', patterns: /middle.?name/i },
  { profileKey: 'fullName', patterns: /full.?name|^name$|travell?er.?name|your.?name/i },

  // Identity
  { profileKey: 'nationalityName', patterns: /national|citizenship/i, inputType: 'select' },
  { profileKey: 'dateOfBirth', patterns: /date.?of.?birth|birth.?date|dob|d\.?o\.?b/i, inputType: 'date' },
  // Note: split Year/Month/Day date selects are handled by fillDateGroup
  // which walks the DOM tree — individual patterns removed to avoid
  // usedKeys conflicts when portals reuse the same IDs/labels.
  { profileKey: 'genderDisplay', patterns: /gender|sex/i, inputType: 'select' },

  // Contact
  { profileKey: 'email', patterns: /e.?mail/i },
  { profileKey: 'phoneNumber', patterns: /phone|mobile|tel|contact.?num/i },

  // Personal
  { profileKey: 'occupation', patterns: /occupation|profession|job/i, inputType: 'select' },
  { profileKey: 'maritalStatus', patterns: /marital|marriage|civil.?status/i, inputType: 'select' },
  { profileKey: 'purposeOfVisit', patterns: /purpose.?(of)?.?(visit|travel|trip|stay)|reason.?(for)?.?(visit|travel)/i, inputType: 'select' },

  // Address
  { profileKey: 'addressLine1', patterns: /address.?(line)?.?1|street|address$/i },
  { profileKey: 'addressLine2', patterns: /address.?(line)?.?2|apt|suite|unit/i },
  { profileKey: 'city', patterns: /^city$|town|home.?city|address.*city/i },
  { profileKey: 'state', patterns: /^state$|province|region|home.?state/i },
  { profileKey: 'postalCode', patterns: /post.?code|zip.?code|postal/i },
  { profileKey: 'addressCountryName', patterns: /home.?country|country.?(of)?.?resid|address.*country/i, inputType: 'select' },

  // Place of birth (map to nationality as a reasonable default for many portals)
  { profileKey: 'nationalityName', patterns: /place.?of.?birth|birth.?place|born.?in/i, inputType: 'select' },

  // Travel
  { profileKey: 'arrivalDate', patterns: /arrival|entry.?date|date.?(of)?.?arrival/i, inputType: 'date' },
  { profileKey: 'departureDate', patterns: /depart|exit.?date|date.?(of)?.?depart|leaving/i, inputType: 'date' },
  { profileKey: 'flightNumber', patterns: /flight.?(no|num|number)|flight$/i },
  { profileKey: 'airlineCode', patterns: /airline|carrier/i, inputType: 'select' },

  // Accommodation
  { profileKey: 'accommodationName', patterns: /hotel|accommodat|lodging|stay.?at|where.?(stay|staying)/i },
  { profileKey: 'accommodationAddress', patterns: /hotel.?addr|accommodat.?addr|stay.?addr/i },
  { profileKey: 'accommodationCity', patterns: /hotel.?city|accommodat.?city|destination.?city/i },
];

/**
 * Build the JavaScript auto-fill script for WebView injection.
 *
 * The script:
 * 1. Scans all <input>, <select>, <textarea> elements
 * 2. For each, reads name, id, placeholder, autocomplete, and label text
 * 3. Matches against FIELD_PATTERNS to find the corresponding profile key
 * 4. Fills matched elements and fires change/input events
 * 5. Posts AUTO_FILL_RESULT back via postMessage
 */
export function buildHeuristicFillScript(
  profileData: Record<string, string>,
): string {
  const dataJson = JSON.stringify(profileData);
  const patternsJson = JSON.stringify(
    FIELD_PATTERNS.map(p => ({
      key: p.profileKey,
      regex: p.patterns.source,
      flags: p.patterns.flags,
      inputType: p.inputType ?? 'text',
    })),
  );

  return `(function(){
  'use strict';
  var profileData=${dataJson};
  var patterns=${patternsJson}.map(function(p){
    return {key:p.key,regex:new RegExp(p.regex,p.flags),inputType:p.inputType};
  });

  function getLabel(el){
    try{
      if(el.id){var lbl=document.querySelector('label[for="'+el.id+'"]');if(lbl)return lbl.textContent||'';}
      var parent=el.parentElement;
      for(var i=0;i<3&&parent;i++){
        if(parent.tagName==='LABEL')return parent.textContent||'';
        var prevSib=parent.previousElementSibling;
        if(prevSib&&(prevSib.tagName==='LABEL'||prevSib.tagName==='SPAN'||prevSib.tagName==='DIV'))return prevSib.textContent||'';
        parent=parent.parentElement;
      }
    }catch(e){}
    return '';
  }

  function matchField(el){
    var attrs=(el.name||'')+'|'+(el.id||'')+'|'+(el.placeholder||'')+'|'+(el.getAttribute('autocomplete')||'')+'|'+getLabel(el);
    for(var i=0;i<patterns.length;i++){
      if(patterns[i].regex.test(attrs)){
        var val=profileData[patterns[i].key];
        if(val!==undefined&&val!=='')return {key:patterns[i].key,value:val,inputType:patterns[i].inputType};
      }
    }
    return null;
  }

  function fillSelect(el,value){
    var opts=Array.from(el.options||[]);
    var vl=value.toLowerCase();
    var match=opts.find(function(o){return o.value.toLowerCase()===vl||o.text.toLowerCase()===vl;})
      ||opts.find(function(o){return o.value.toLowerCase().indexOf(vl)>=0||o.text.toLowerCase().indexOf(vl)>=0;})
      ||opts.find(function(o){return vl.indexOf(o.value.toLowerCase())>=0||vl.indexOf(o.text.toLowerCase())>=0;});
    if(match){el.value=match.value;el.dispatchEvent(new Event('change',{bubbles:true}));return true;}
    return false;
  }

  function fillInput(el,value){
    var desc=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value');
    if(desc&&desc.set){desc.set.call(el,value);}else{el.value=value;}
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    el.style.outline='2px solid #3B82F6';
    (function(e){setTimeout(function(){e.style.outline='';},2500);}(el));
    return true;
  }

  var filled=0,total=0,results=[];

  // Smart date group detection: find 3 adjacent selects near a date label
  function tryFillSelect(sel,val){
    // Try exact, then zero-padded, then unpadded
    if(fillSelect(sel,val))return true;
    if(val.length===1&&fillSelect(sel,'0'+val))return true;
    if(val.length===2&&val[0]==='0'&&fillSelect(sel,val[1]))return true;
    return false;
  }

  function identifyDateSelect(sel,index){
    var id=(sel.name||sel.id||'').toLowerCase();
    var label=getLabel(sel).toLowerCase();
    var hint=id+' '+label;
    if(hint.match(/year/))return 'year';
    if(hint.match(/month/))return 'month';
    if(hint.match(/day/))return 'day';
    // Fallback by position: Year, Month, Day
    return ['year','month','day'][index]||'unknown';
  }

  function fillDateGroup(selects,yearVal,monthVal,dayVal){
    var count=0;
    var yearSel=null,monthSel=null,daySel=null;
    for(var s=0;s<selects.length;s++){
      var role=identifyDateSelect(selects[s],s);
      if(role==='year')yearSel=selects[s];
      else if(role==='month')monthSel=selects[s];
      else if(role==='day')daySel=selects[s];
    }
    // Fill Year first, then Month (may populate Day options), then Day with delay
    if(yearSel&&tryFillSelect(yearSel,yearVal))count++;
    if(monthSel&&tryFillSelect(monthSel,monthVal))count++;
    // Day options may be dynamically populated after Year+Month change
    // Try immediately, then retry after 500ms
    if(daySel){
      if(tryFillSelect(daySel,dayVal)){count++;}
      else{
        var ds=daySel,dv=dayVal;
        setTimeout(function(){tryFillSelect(ds,dv);},500);
        count++;
      }
    }
    return count;
  }

  // Smart date group detection: walk up from each select to find groups of 3
  // near date-related text (birth, expiry, arrival, departure)
  var allSelects=document.querySelectorAll('select');
  var processedSelects=new Set();
  for(var si=0;si<allSelects.length;si++){
    var sel=allSelects[si];
    if(processedSelects.has(sel))continue;
    // Walk up to find a container with 3+ selects and date text
    var container=sel.parentElement;
    for(var up=0;up<5&&container;up++){
      var containerSelects=container.querySelectorAll('select');
      var containerText=(container.textContent||'').toLowerCase();
      if(containerSelects.length>=3){
        var sels=Array.from(containerSelects).slice(0,3);
        var anyEmpty=sels.some(function(s){return !s.value||s.value==='';});
        if(!anyEmpty)break;
        if(containerText.match(/birth|dob|date of birth/)&&profileData.birthYear){
          var fb=fillDateGroup(sels,profileData.birthYear,profileData.birthMonth,profileData.birthDay);
          if(fb>0){filled+=fb;total+=fb;results.push({id:'dateOfBirth',status:'filled'});sels.forEach(function(s){processedSelects.add(s);});}
          break;
        }
        if(containerText.match(/expir|date of expiry|passport.*expir/)&&profileData.expiryYear){
          var fe=fillDateGroup(sels,profileData.expiryYear,profileData.expiryMonth,profileData.expiryDay);
          if(fe>0){filled+=fe;total+=fe;results.push({id:'passportExpiry',status:'filled'});sels.forEach(function(s){processedSelects.add(s);});}
          break;
        }
        if(containerText.match(/arrival|entry.*date/)&&profileData.arrivalDate){
          var parts=profileData.arrivalDate.split('-');
          if(parts.length===3){var fa=fillDateGroup(sels,parts[0],String(parseInt(parts[1],10)),String(parseInt(parts[2],10)));if(fa>0){filled+=fa;total+=fa;results.push({id:'arrivalDate',status:'filled'});sels.forEach(function(s){processedSelects.add(s);});}}
          break;
        }
        break;
      }
      container=container.parentElement;
    }
  }

  var elements=document.querySelectorAll('input,select,textarea');
  var usedKeys={};

  for(var i=0;i<elements.length;i++){
    var el=elements[i];
    if(el.type==='hidden'||el.type==='submit'||el.type==='button'||el.type==='reset')continue;
    if(el.offsetParent===null&&el.type!=='hidden')continue;

    var m=matchField(el);
    if(!m)continue;
    if(usedKeys[m.key])continue;

    total++;
    var existing=(el.value!==undefined?el.value.toString().trim():'');
    if(existing!==''){results.push({id:m.key,status:'skipped'});usedKeys[m.key]=true;continue;}

    var ok=false;
    if(el.tagName==='SELECT'){ok=fillSelect(el,m.value);}
    else{ok=fillInput(el,m.value);}

    if(ok){filled++;results.push({id:m.key,status:'filled'});usedKeys[m.key]=true;}
    else{results.push({id:m.key,status:'failed'});}
  }

  window.ReactNativeWebView.postMessage(JSON.stringify({
    type:'AUTO_FILL_RESULT',filled:filled,total:total,results:results
  }));
  true;
})();`;
}

export const heuristicFiller = { buildHeuristicFillScript, buildFillData };
