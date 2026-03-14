/**
 * FormFiller — builds auto-fill JavaScript snippets for injection into government portal WebViews
 * and parses the results posted back via window.ReactNativeWebView.postMessage.
 */

export interface FieldSpec {
  id: string;
  selector: string;
  value: string;
  inputType: 'text' | 'select' | 'radio' | 'checkbox' | 'date';
}

export interface FillResult {
  filled: number;
  total: number;
  fillRate: number;
  results: Array<{ id: string; status: 'filled' | 'failed' | 'not_found' | 'skipped' }>;
}

export class FormFiller {
  /**
   * Build the JavaScript snippet that is injected into a WebView page to auto-fill form fields.
   *
   * Design goals:
   * - Non-destructive: skips fields that already have a value.
   * - Works for text, select, radio, checkbox, and date inputs.
   * - Reports results back via window.ReactNativeWebView.postMessage so the
   *   screen can show the AutoFillBanner.
   * - Adds a brief blue highlight to each successfully filled field.
   */
  buildAutoFillScript(fields: FieldSpec[]): string {
    const fieldsJson = JSON.stringify(fields);

    return (
      '(function(){' +
      'var fields=' + fieldsJson + ';' +
      'var filled=0,failed=0;' +
      'var results=[];' +
      'for(var i=0;i<fields.length;i++){' +
        'var f=fields[i];' +
        'try{' +
          'var el=document.querySelector(f.selector);' +
          'if(!el){results.push({id:f.id,status:"not_found"});failed++;continue;}' +
          'var existing=(el.value!==undefined?el.value.toString().trim():"");' +
          'if(existing!==""){results.push({id:f.id,status:"skipped"});continue;}' +
          'if(f.inputType==="select"){' +
            'var opts=Array.from(el.options||[]);' +
            'var m=opts.find(function(o){return o.value===f.value;})||' +
                'opts.find(function(o){return o.text.toLowerCase().indexOf(f.value.toLowerCase())>=0;});' +
            'if(m){el.value=m.value;el.dispatchEvent(new Event("change",{bubbles:true}));' +
              'results.push({id:f.id,status:"filled"});filled++;}' +
            'else{results.push({id:f.id,status:"failed"});failed++;}' +
          '}else if(f.inputType==="radio"){' +
            'var r=document.querySelector(f.selector);' +
            'if(r){r.checked=true;r.dispatchEvent(new Event("change",{bubbles:true}));' +
              'results.push({id:f.id,status:"filled"});filled++;}' +
            'else{results.push({id:f.id,status:"failed"});failed++;}' +
          '}else if(f.inputType==="checkbox"){' +
            'el.checked=(f.value==="true");' +
            'el.dispatchEvent(new Event("change",{bubbles:true}));' +
            'results.push({id:f.id,status:"filled"});filled++;' +
          '}else{' +
            'var desc=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value");' +
            'if(desc&&desc.set){desc.set.call(el,f.value);}else{el.value=f.value;}' +
            'el.dispatchEvent(new Event("input",{bubbles:true}));' +
            'el.dispatchEvent(new Event("change",{bubbles:true}));' +
            'el.style.outline="2px solid #3B82F6";' +
            '(function(e){setTimeout(function(){e.style.outline="";},2500);}(el));' +
            'results.push({id:f.id,status:"filled"});filled++;' +
          '}' +
        '}catch(e){results.push({id:f.id,status:"failed",error:e.message});failed++;}' +
      '}' +
      'window.ReactNativeWebView.postMessage(JSON.stringify({' +
        'type:"AUTO_FILL_RESULT",' +
        'filled:filled,' +
        'failed:failed,' +
        'total:fields.length,' +
        'results:results' +
      '}));' +
      'true;' +
      '})();'
    );
  }

  /**
   * Returns true if the fill rate is sufficient (>= 50%) to consider auto-fill successful.
   */
  isAutoFillSufficient(fillRate: number): boolean {
    return fillRate >= 0.5;
  }

  /**
   * Parse a postMessage payload from the WebView and return a FillResult, or null if the
   * payload is not a valid AUTO_FILL_RESULT message.
   */
  parseFillResult(messageData: string): FillResult | null {
    try {
      const parsed = JSON.parse(messageData) as Record<string, unknown>;
      if (parsed.type !== 'AUTO_FILL_RESULT') return null;

      const total = typeof parsed.total === 'number' ? parsed.total : 0;
      const filled = typeof parsed.filled === 'number' ? parsed.filled : 0;
      const fillRate = total > 0 ? filled / total : 0;

      const rawResults = Array.isArray(parsed.results) ? parsed.results : [];
      const results: FillResult['results'] = rawResults.map((r) => {
        const item = r as Record<string, unknown>;
        return {
          id: typeof item.id === 'string' ? item.id : '',
          status: (['filled', 'failed', 'not_found', 'skipped'] as const).includes(
            item.status as 'filled' | 'failed' | 'not_found' | 'skipped',
          )
            ? (item.status as 'filled' | 'failed' | 'not_found' | 'skipped')
            : 'failed',
        };
      });

      return { filled, total, fillRate, results };
    } catch {
      return null;
    }
  }
}

export const formFiller = new FormFiller();
