import React from "react";
import { Textarea } from "@/components/ui/textarea";

export interface UnifiedLayoutEngineProps {
  gender: "male" | "female";
  category?: string;
  measurements: Record<string, string>;
  stylingPrefs: Record<string, any>;
  notes: string;
  setM?: (key: string, val: string) => void;
  setS?: (key: string, val: any) => void;
  setNotes?: (val: string) => void;
  readOnly?: boolean;
}

export function UnifiedLayoutEngine({
  gender,
  category,
  measurements,
  stylingPrefs,
  notes,
  setM,
  setS,
  setNotes,
  readOnly = false,
}: UnifiedLayoutEngineProps) {
  
  const TdLabel = ({ children, className = "", colSpan, rowSpan }: any) => (
    <td colSpan={colSpan} rowSpan={rowSpan} className={`border border-blue-400 p-1 text-center font-semibold text-blue-900 dark:text-blue-200 bg-white dark:bg-slate-900/50 ${className}`}>
      {children}
    </td>
  );

  const TdInput = ({ value, onChange, colSpan, className = "" }: any) => (
    <td colSpan={colSpan} className={`border border-blue-400 p-0 bg-white dark:bg-slate-950/50 ${className}`}>
      {readOnly ? (
         <div className="w-full h-full min-h-[24px] flex items-center justify-center font-medium text-blue-950 dark:text-blue-100">
           {value || ""}
         </div>
      ) : (
        <input 
          type="text" 
          value={value || ""} 
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full h-full min-h-[24px] px-1 text-center border-none outline-none focus:ring-1 focus:ring-blue-500 text-blue-950 dark:text-blue-100 bg-transparent"
        />
      )}
    </td>
  );

  const TdCheck = ({ label, checked, onChange, colSpan, className = "" }: any) => (
    <td colSpan={colSpan} className={`border border-blue-400 p-1 text-center bg-white dark:bg-slate-950/50 ${className}`}>
      <div className="flex flex-col items-center justify-center gap-1 cursor-pointer group" onClick={() => !readOnly && onChange?.(!checked)}>
        {label && <span className="text-[10px] leading-tight font-semibold text-blue-900 dark:text-blue-200 group-hover:text-blue-600 transition-colors">{label}</span>}
        <div className={`w-3 h-3 border flex items-center justify-center transition-colors ${checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-blue-400 dark:border-blue-600 bg-transparent group-hover:border-blue-500'}`}>
          {checked && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      </div>
    </td>
  );

  const isMale = gender === "male";
  const isCoat = category === "prince_coat" || category === "simple_pent_coat";
  const isShirt = category === "shirt";
  
  const isFemaleShalwarKameez = category === "simple_shalwar" || (!isMale && !category);
  const isLehnga = category === "lehnga_kurti";
  const isSaari = category === "saari";
  const isFrock = category === "frock";

  const rightFields = [];
  let rightHeader = "Trouser";

  if (isMale) {
    if (!isShirt) {
      rightHeader = isCoat ? "Pent" : "Trouser";
      rightFields.push(
        { label: 'Length', key: 'pent_length' },
        { label: 'Pencha', key: 'pent_pancha' },
        { label: 'Tigh', key: 'pent_tigh' },
        { label: 'Waist', key: 'pent_waist' },
        { label: 'Lastic', key: 'pent_lastic' },
        { label: 'Pocket', key: 'pent_pocket' }
      );
    }
  } else {
    if (isFemaleShalwarKameez) {
      rightHeader = "Trouser";
      rightFields.push(
        { label: 'Length', key: 'pent_length' },
        { label: 'Pencha', key: 'pent_pancha' },
        { label: 'Thigh', key: 'pent_tigh' },
        { label: 'Lastic', key: 'pent_lastic' }
      );
    } else if (isLehnga) {
      rightHeader = "LENGHA";
      rightFields.push(
        { label: 'Length', key: 'pent_length' },
        { label: 'Waist', key: 'pent_waist' }
      );
    } else if (isFrock) {
      rightHeader = "Trouser";
      rightFields.push(
        { label: 'Length', key: 'pent_length' },
        { label: 'Waist', key: 'pent_waist' }
      );
    } else if (isSaari) {
      rightHeader = "SAARI";
      rightFields.push(
        { label: 'Length', key: 'pent_length' },
        { label: 'Waist', key: 'pent_waist' }
      );
    }
  }

  return (
    <div className="w-full text-[10px] sm:text-xs font-sans overflow-x-auto pb-4">
      <div className="min-w-[800px] border-2 border-blue-400 bg-white dark:bg-slate-900/20 p-2 flex gap-2">
        
        {/* Left Section */}
        <div className="flex-1">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{width: '12%'}}/>
              <col style={{width: '9%'}}/>
              <col style={{width: '11%'}}/>
              <col style={{width: '9%'}}/>
              <col style={{width: '7%'}}/>
              <col style={{width: '8%'}}/>
              <col style={{width: '10%'}}/>
              <col style={{width: '8%'}}/>
              <col style={{width: '10%'}}/>
              <col style={{width: '5%'}}/>
              <col style={{width: '6%'}}/>
            </colgroup>
            <tbody>
              {/* Row 1: Length */}
              <tr>
                <TdLabel>Length</TdLabel>
                <TdInput colSpan={10} value={measurements.length} onChange={(v: string) => setM?.('length', v)} />
              </tr>
              {/* Row 2: Shoulder */}
              <tr>
                <TdLabel>Shoulder</TdLabel>
                <TdInput colSpan={10} value={measurements.shoulder} onChange={(v: string) => setM?.('shoulder', v)} />
              </tr>
              {/* Row 3: Sleeves */}
              <tr>
                <TdLabel>Sleeves</TdLabel>
                <TdInput value={measurements.sleeves} onChange={(v: string) => setM?.('sleeves', v)} />
                <TdLabel>arm hole<br/>Golai</TdLabel>
                <TdInput value={measurements.arm_hole_golai} onChange={(v: string) => setM?.('arm_hole_golai', v)} />
                <TdLabel>Caff</TdLabel>
                <TdInput value={measurements.caff} onChange={(v: string) => setM?.('caff', v)} />
                <TdLabel>Caff Plate</TdLabel>
                <TdInput value={measurements.caff_plate} onChange={(v: string) => setM?.('caff_plate', v)} />
                <TdCheck label={<>Gol<br/>Bazoo</>} checked={stylingPrefs.gol_bazoo} onChange={(v: boolean) => setS?.('gol_bazoo', v)} />
                <TdCheck label="Double" checked={stylingPrefs.sleeve_stitching === 'DOUBLE'} onChange={(v: boolean) => v && setS?.('sleeve_stitching', 'DOUBLE')} />
                <TdCheck label="Single" checked={stylingPrefs.sleeve_stitching === 'SINGLE'} onChange={(v: boolean) => v && setS?.('sleeve_stitching', 'SINGLE')} />
              </tr>
              {/* Row 4: Neck */}
              <tr>
                <TdLabel>Neck</TdLabel>
                <TdInput value={measurements.neck} onChange={(v: string) => setM?.('neck', v)} />
                <TdLabel>Patti</TdLabel>
                <TdInput value={measurements.patti} onChange={(v: string) => setM?.('patti', v)} />
                <TdLabel>Bane</TdLabel>
                <TdInput value={measurements.bane} onChange={(v: string) => setM?.('bane', v)} />
                <TdLabel>Nok</TdLabel>
                <TdInput value={measurements.nok} onChange={(v: string) => setM?.('nok', v)} />
                <TdCheck label="Collar" checked={stylingPrefs.collar} onChange={(v: boolean) => setS?.('collar', v)} />
                <TdCheck label="Bane" checked={stylingPrefs.bane_check} onChange={(v: boolean) => setS?.('bane_check', v)} />
                <td className="border border-blue-400 bg-white dark:bg-slate-950/50"></td>
              </tr>
              {/* Row 5: Chest */}
              <tr>
                <TdLabel>Chest</TdLabel>
                <TdInput colSpan={10} value={measurements.chest} onChange={(v: string) => setM?.('chest', v)} />
              </tr>
              {/* Row 6: Waist */}
              <tr>
                <TdLabel>Waist</TdLabel>
                <TdInput colSpan={10} value={measurements.waist} onChange={(v: string) => setM?.('waist', v)} />
              </tr>

              {/* Male Rows */}
              {isMale && (
                <>
                  <tr>
                    <TdLabel>Gherra</TdLabel>
                    <TdInput colSpan={7} value={measurements.gherra} onChange={(v: string) => setM?.('gherra', v)} />
                    <TdCheck label="Gol" checked={stylingPrefs.shalwar_type === 'GOL'} onChange={(v: boolean) => v && setS?.('shalwar_type', 'GOL')} />
                    <TdCheck label="Choras" checked={stylingPrefs.shalwar_type === 'CHORAS'} onChange={(v: boolean) => v && setS?.('shalwar_type', 'CHORAS')} />
                    <td className="border border-blue-400 bg-white dark:bg-slate-950/50"></td>
                  </tr>
                  
                  {isCoat ? (
                    <tr>
                      <TdLabel>Hip</TdLabel>
                      <td colSpan={3} className="border border-blue-400 relative p-0 bg-white dark:bg-slate-950/50">
                        <span className="absolute inset-0 flex items-center justify-center text-blue-500 opacity-30 text-xl font-bold italic pointer-events-none">HIP</span>
                        <input type="text" value={measurements.hip_shalwar || ""} onChange={(e) => setM?.('hip_shalwar', e.target.value)} disabled={readOnly} className="w-full h-full min-h-[24px] px-1 text-center border-none outline-none focus:ring-1 focus:ring-blue-500 bg-transparent text-blue-950 dark:text-blue-100 relative z-10" />
                      </td>
                      <TdLabel>Gherra</TdLabel>
                      <TdInput colSpan={3} value={measurements.hip_gherra} onChange={(v: string) => setM?.('hip_gherra', v)} />
                      <TdLabel>Assan</TdLabel>
                      <TdInput colSpan={2} value={measurements.hip_assan} onChange={(v: string) => setM?.('hip_assan', v)} />
                    </tr>
                  ) : (
                    <tr>
                      <TdLabel>Shalwar</TdLabel>
                      <TdInput colSpan={3} value={measurements.shalwar} onChange={(v: string) => setM?.('shalwar', v)} />
                      <TdLabel>Gherra</TdLabel>
                      <TdInput colSpan={3} value={measurements.shalwar_gherra} onChange={(v: string) => setM?.('shalwar_gherra', v)} />
                      <TdLabel>Assan</TdLabel>
                      <TdInput colSpan={2} value={measurements.shalwar_assan} onChange={(v: string) => setM?.('shalwar_assan', v)} />
                    </tr>
                  )}
                  
                  {(!isCoat) && (
                    <tr>
                      <TdLabel>Pancha</TdLabel>
                      <TdInput colSpan={10} value={measurements.pancha} onChange={(v: string) => setM?.('pancha', v)} />
                    </tr>
                  )}

                  <tr>
                    <TdLabel>Pocket</TdLabel>
                    <TdCheck colSpan={2} label="Front" checked={stylingPrefs.pocket_front} onChange={(v: boolean) => setS?.('pocket_front', v)} />
                    <TdCheck colSpan={2} label="Side" checked={stylingPrefs.pocket_side} onChange={(v: boolean) => setS?.('pocket_side', v)} />
                    <TdCheck colSpan={2} label="Shalwar" checked={stylingPrefs.pocket_shalwar} onChange={(v: boolean) => setS?.('pocket_shalwar', v)} />
                    <td colSpan={4} className="border border-blue-400 bg-white dark:bg-slate-950/50"></td>
                  </tr>
                </>
              )}

              {/* Female Rows */}
              {!isMale && (
                <>
                  <tr>
                    <TdLabel>Hip</TdLabel>
                    {isFrock ? (
                      <TdInput colSpan={10} value={measurements.hip} onChange={(v: string) => setM?.('hip', v)} />
                    ) : (isFemaleShalwarKameez || isLehnga) ? (
                      <>
                        <TdInput colSpan={3} value={measurements.hip} onChange={(v: string) => setM?.('hip', v)} />
                        <TdCheck colSpan={1} label="Hip" checked={stylingPrefs.hip_check} onChange={(v: boolean) => setS?.('hip_check', v)} />
                        <TdLabel colSpan={1}>Assan</TdLabel>
                        <TdInput colSpan={5} value={measurements.hip_assan} onChange={(v: string) => setM?.('hip_assan', v)} />
                      </>
                    ) : (
                      <TdInput colSpan={10} value={measurements.hip} onChange={(v: string) => setM?.('hip', v)} />
                    )}
                  </tr>

                  {(isFemaleShalwarKameez || isLehnga) && (
                    <tr>
                      <TdLabel>Chaak</TdLabel>
                      <TdInput colSpan={10} value={measurements.chaak} onChange={(v: string) => setM?.('chaak', v)} />
                    </tr>
                  )}
                  
                  {isFrock ? (
                    <tr>
                      <TdLabel>Gherra</TdLabel>
                      <TdInput colSpan={10} value={measurements.gherra} onChange={(v: string) => setM?.('gherra', v)} />
                    </tr>
                  ) : (
                    <tr>
                      <TdLabel>Shalwar</TdLabel>
                      <TdInput colSpan={3} value={measurements.shalwar} onChange={(v: string) => setM?.('shalwar', v)} />
                      <TdLabel>Gherra</TdLabel>
                      <TdInput colSpan={3} value={measurements.shalwar_gherra} onChange={(v: string) => setM?.('shalwar_gherra', v)} />
                      <TdLabel>Assan</TdLabel>
                      <TdInput colSpan={2} value={measurements.shalwar_assan} onChange={(v: string) => setM?.('shalwar_assan', v)} />
                    </tr>
                  )}

                  {(!isFrock) && (
                    <tr>
                      <TdLabel>Pancha</TdLabel>
                      <TdInput colSpan={10} value={measurements.pancha} onChange={(v: string) => setM?.('pancha', v)} />
                    </tr>
                  )}

                  <tr>
                    <TdLabel>Pocket</TdLabel>
                    <TdCheck colSpan={2} label="Front" checked={stylingPrefs.pocket_front} onChange={(v: boolean) => setS?.('pocket_front', v)} />
                    <TdCheck colSpan={2} label="Side" checked={stylingPrefs.pocket_side} onChange={(v: boolean) => setS?.('pocket_side', v)} />
                    <TdCheck colSpan={2} label="Shalwar" checked={stylingPrefs.pocket_shalwar} onChange={(v: boolean) => setS?.('pocket_shalwar', v)} />
                    <td colSpan={4} className="border border-blue-400 bg-white dark:bg-slate-950/50"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
          
          <div className="mt-4">
            <div className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Tailor Notes:</div>
            {readOnly ? (
              <div className="min-h-[40px] p-2 bg-slate-50 dark:bg-slate-900 border border-blue-400 rounded text-sm italic text-blue-950 dark:text-blue-100">
                {notes || "No notes"}
              </div>
            ) : (
              <Textarea 
                value={notes} 
                onChange={(e) => setNotes?.(e.target.value)} 
                className="min-h-[60px] text-xs resize-none bg-white dark:bg-slate-950/80 border-blue-400"
                placeholder="Stitching charges, extra notes..."
              />
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="w-[180px] flex flex-col justify-between ml-2">
          {rightFields.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th colSpan={2} className="border border-blue-400 p-1 text-center font-bold text-blue-900 dark:text-blue-200 bg-white dark:bg-slate-900/50 tracking-wider">
                    {rightHeader}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rightFields.map((f, i) => (
                  <tr key={i}>
                    <TdLabel className="w-20 text-left px-2">{f.label}</TdLabel>
                    <TdInput value={measurements[f.key]} onChange={(v: string) => setM?.(f.key, v)} />
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="w-full h-full border border-blue-400 bg-white dark:bg-slate-950/50 min-h-[200px]"></div>
          )}

          <div className="mt-auto self-end pt-4">
            <table className="border-collapse">
              <tbody>
                <tr>
                  <TdLabel className="px-2">Zip</TdLabel>
                  <TdCheck checked={stylingPrefs.zip} onChange={(v: boolean) => setS?.('zip', v)} className="w-8" />
                  <TdInput value={measurements.zip_val} onChange={(v: string) => setM?.('zip_val', v)} className="w-10" />
                </tr>
                {!isMale && (
                  <tr>
                    <TdLabel className="px-2">Plate</TdLabel>
                    <TdCheck checked={stylingPrefs.plate} onChange={(v: boolean) => setS?.('plate', v)} className="w-8" />
                    <TdInput value={measurements.plate_val} onChange={(v: string) => setM?.('plate_val', v)} className="w-10" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}
