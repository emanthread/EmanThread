import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  
  const NumInput = ({ label, value, onChange, className = "" }: any) => {
    if (readOnly) {
      return (
        <div className={`flex items-center gap-1 ${className}`}>
          {label && <Label className="text-xs text-blue-800 dark:text-blue-300 font-medium">{label}</Label>}
          <span className="font-semibold px-2 py-0.5 border-b border-gray-400 min-w-[40px] text-center inline-block">
            {value || "—"}
          </span>
        </div>
      );
    }
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {label && <Label className="text-xs text-blue-800 dark:text-blue-300 font-medium">{label}</Label>}
        <Input 
          type="number" step="0.25" min="0" placeholder="0" 
          value={value || ""} onChange={(e) => onChange?.(e.target.value)}
          className="h-8 text-sm px-2 font-medium bg-white/50 dark:bg-slate-950/50"
        />
      </div>
    );
  };

  const CheckInput = ({ label, checked, onChange, className = "" }: any) => {
    if (readOnly) {
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          {label && <Label className="text-xs text-blue-800 dark:text-blue-300 font-medium cursor-pointer">
            {label}
          </Label>}
          <span className="text-lg leading-none">{checked ? "☑" : "☐"}</span>
        </div>
      );
    }
    return (
      <label className={`flex flex-col items-center gap-1 cursor-pointer group ${className}`}>
        {label && <span className="text-xs text-blue-800 dark:text-blue-300 font-medium">{label}</span>}
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
          ${checked ? "bg-blue-600 border-blue-600 text-white" : "border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 group-hover:border-blue-400"}
        `}>
          {checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <input type="checkbox" className="hidden" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} />
      </label>
    );
  };

  const isCoat = category === "prince_coat" || category === "simple_pent_coat";
  const isShirt = category === "shirt";
  // Shalwar Kameez is the baseline; no category = show everything
  const hasShalwar = category === "shalwar_kameez" || !category;
  // Shirt has no trouser column; Coat and Shalwar Kameez do
  const hasTrouser = !isShirt;

  // Female category logic
  const isLehnga = category === "lehnga_kurti";
  const isSaari = category === "saari";
  const isFrock = category === "frock";
  // Bottom shalwar block absent for everything except Ladies Shalwar Kameez (baseline)
  const showFemaleBottom = !isLehnga && !isSaari && !isFrock && !isShirt;
  // Right column for Lehnga/Saari shows only Length+Waist (no Pencha/Thigh/Lastic)
  const femaleRightSimple = isLehnga || isSaari;
  // Zip+Plate absent for Lehnga, Saari, Frock
  const showFemaleZip = !isLehnga && !isSaari && !isFrock;
  const femaleRightLabel = isLehnga ? "LENGHA" : isSaari ? "SAARI" : "Trouser";

  return (
    <div className={`flex flex-col md:flex-row ${readOnly ? "text-black print:text-black" : ""}`}>
      {gender === "male" ? (
        <div className="flex flex-col md:flex-row w-full">
          {/* Left Column (Shirt & Shalwar) */}
          <div className={`flex-1 p-4 grid gap-3 border-blue-900/10 dark:border-blue-500/10 ${readOnly ? "border-r border-gray-400" : "border-r-2"}`}>
            {/* Row 1: Length */}
            <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Length</div>
              <NumInput value={measurements.length} onChange={(v: string) => setM?.('length', v)} className="w-20" />
            </div>

            {/* Row 2: Shoulder */}
            <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Shoulder</div>
              <NumInput value={measurements.shoulder} onChange={(v: string) => setM?.('shoulder', v)} className="w-20" />
            </div>

            {/* Row 3: Sleeves — Coat removes Golai/Caff/CaffPlate/GolBazoo/Double/Single; Shirt removes GolBazoo */}
            <div className={`flex gap-2 items-end pb-3 flex-wrap ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Sleeves</div>
              <NumInput value={measurements.sleeves} onChange={(v: string) => setM?.('sleeves', v)} className="w-20 mr-2" />
              {!isCoat && (
                <>
                  <NumInput label="arm hole Golai" value={measurements.arm_hole_golai} onChange={(v: string) => setM?.('arm_hole_golai', v)} className="w-16" />
                  <NumInput label="Caff" value={measurements.caff} onChange={(v: string) => setM?.('caff', v)} className="w-16" />
                  <NumInput label="Caff Plate" value={measurements.caff_plate} onChange={(v: string) => setM?.('caff_plate', v)} className="w-16" />
                  {!isShirt && <CheckInput label="Gol Bazoo" checked={stylingPrefs.gol_bazoo} onChange={(v: boolean) => setS?.('gol_bazoo', v)} className="w-14" />}
                  <div className="flex gap-1 ml-2">
                    <CheckInput label="Double" checked={stylingPrefs.sleeve_stitching === 'DOUBLE'} onChange={(v: boolean) => v && setS?.('sleeve_stitching', 'DOUBLE')} className="w-14" />
                    <CheckInput label="Single" checked={stylingPrefs.sleeve_stitching === 'SINGLE'} onChange={(v: boolean) => v && setS?.('sleeve_stitching', 'SINGLE')} className="w-14" />
                  </div>
                </>
              )}
            </div>

            {/* Row 4: Neck — Coat removes Patti/Bane/Nok; Collar stays for all */}
            <div className={`flex gap-2 items-end pb-3 flex-wrap ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Neck</div>
              <NumInput value={measurements.neck} onChange={(v: string) => setM?.('neck', v)} className="w-20 mr-2" />
              <div className="flex gap-2">
                {!isCoat && <CheckInput label="Patti" checked={stylingPrefs.patti} onChange={(v: boolean) => setS?.('patti', v)} className="w-12" />}
                {!isCoat && <CheckInput label="Bane" checked={stylingPrefs.bane} onChange={(v: boolean) => setS?.('bane', v)} className="w-12" />}
                {!isCoat && <CheckInput label="Nok" checked={stylingPrefs.nok} onChange={(v: boolean) => setS?.('nok', v)} className="w-12" />}
                <CheckInput label="Collar" checked={stylingPrefs.collar} onChange={(v: boolean) => setS?.('collar', v)} className="w-12" />
              </div>
            </div>

            {/* Row 5: Chest */}
            <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Chest</div>
              <NumInput value={measurements.chest} onChange={(v: string) => setM?.('chest', v)} className="w-20" />
            </div>

            {/* Row 6: Waist */}
            <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Waist</div>
              <NumInput value={measurements.waist} onChange={(v: string) => setM?.('waist', v)} className="w-20" />
            </div>

            {/* Row 7: Gherra / Hip */}
            <div className={`flex gap-2 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">
                {isCoat ? (
                  <span className="relative inline-block mt-2">
                    <span className="line-through decoration-2 opacity-50 text-gray-500">Gherra</span>
                    <span className="absolute -top-3 -left-1 text-blue-600 dark:text-blue-400 font-bold text-lg" style={{ fontFamily: "cursive, 'Comic Sans MS'", transform: "rotate(-5deg)" }}>HIP</span>
                  </span>
                ) : (
                  "Gherra"
                )}
              </div>
              <NumInput value={isCoat ? measurements.hip : measurements.gherra} onChange={(v: string) => isCoat ? setM?.('hip', v) : setM?.('gherra', v)} className="w-20 mr-2" />
              {/* Gol/Choras: removed for Prince Coat */}
              {!isCoat && (
                <div className="flex gap-2">
                  <CheckInput label="Gol" checked={stylingPrefs.shalwar_type === 'GOL'} onChange={(v: boolean) => v && setS?.('shalwar_type', 'GOL')} className="w-14" />
                  <CheckInput label="Choras" checked={stylingPrefs.shalwar_type === 'CHORAS'} onChange={(v: boolean) => v && setS?.('shalwar_type', 'CHORAS')} className="w-14" />
                </div>
              )}
            </div>

            {/* Row 8: Shalwar — omitted for Coat and Shirt */}
            {hasShalwar && !isShirt && (
              <div className={`flex gap-2 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Shalwar</div>
                <NumInput value={measurements.shalwar} onChange={(v: string) => setM?.('shalwar', v)} className="w-20 mr-2" />
                <NumInput label="Gherra" value={measurements.shalwar_gherra} onChange={(v: string) => setM?.('shalwar_gherra', v)} className="w-16" />
                <NumInput label="Assan" value={measurements.shalwar_assan} onChange={(v: string) => setM?.('shalwar_assan', v)} className="w-16" />
              </div>
            )}

            {/* Row 9: Pancha — omitted for Coat and Shirt */}
            {hasShalwar && !isCoat && !isShirt && (
              <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Pancha</div>
                <NumInput value={measurements.pancha} onChange={(v: string) => setM?.('pancha', v)} className="w-20" />
              </div>
            )}

            {/* Row 10: Pocket — Front/Side omitted for Coat and Shirt; Shalwar pocket omitted when no shalwar */}
            {(!isCoat && !isShirt) && (
              <div className="flex gap-2 items-end mt-2">
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Pocket</div>
                <div className="w-20 mr-2" />
                <div className="flex gap-2">
                  <CheckInput label="Front" checked={stylingPrefs.pocket_front} onChange={(v: boolean) => setS?.('pocket_front', v)} className="w-14" />
                  <CheckInput label="Side" checked={stylingPrefs.pocket_side} onChange={(v: boolean) => setS?.('pocket_side', v)} className="w-14" />
                </div>
                {hasShalwar && (
                  <div className="ml-2">
                    <CheckInput label="Shalwar" checked={stylingPrefs.pocket_shalwar} onChange={(v: boolean) => setS?.('pocket_shalwar', v)} className="w-14" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column (Trouser & Extras) */}
          <div className={`w-full md:w-64 flex flex-col ${readOnly ? "border-l border-gray-400" : "border-l-2 border-blue-900/10 dark:border-blue-500/10 bg-blue-50/30 dark:bg-blue-950/10"}`}>
            <div className="flex flex-col h-full">
              
              <div className={`flex-1 p-3 relative ${!hasTrouser ? "opacity-20 pointer-events-none grayscale" : ""}`}>
                {!hasTrouser && <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"><div className="w-full h-full border-l-[3px] border-black/40 rotate-[20deg] origin-center translate-x-6"></div></div>}
                <div className={`border border-blue-200 dark:border-blue-800 ${readOnly ? "border-gray-400" : ""} rounded-sm overflow-hidden`}>
                  
                  {/* Pent / Trouser Header */}
                  <div className={`p-1.5 text-center font-bold text-sm ${readOnly ? "border-b border-gray-400 bg-gray-100" : "border-b border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300"}`}>
                    {isCoat ? "Pent" : "Pent / Trouser"}
                  </div>

                  {/* Rows */}
                  <div className="flex flex-col divide-y divide-blue-100 dark:divide-blue-900/30">
                    
                    {/* Length */}
                    <div className={`flex items-stretch h-8 ${readOnly ? "divide-gray-400 divide-x" : "divide-x divide-blue-200 dark:divide-blue-800"}`}>
                      <div className="w-6 flex items-center justify-center font-bold text-sm text-blue-800 dark:text-blue-400 print:text-black">L</div>
                      <div className="w-16 flex items-center px-1 text-xs font-medium text-blue-900 dark:text-blue-300 print:text-black">Length</div>
                      <div className="flex-1 flex items-center justify-center p-0.5 bg-white/50 dark:bg-slate-950/50">
                        {readOnly ? (
                          <span className="font-semibold text-sm">{measurements.trouser_length || "—"}</span>
                        ) : (
                          <Input type="number" step="0.25" min="0" placeholder="0" value={measurements.trouser_length || ""} onChange={(e) => setM?.('trouser_length', e.target.value)} className="h-full w-full px-1 text-center font-medium border-0 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-none bg-transparent" />
                        )}
                      </div>
                    </div>

                    {/* Pencha */}
                    <div className={`flex items-stretch h-8 ${readOnly ? "divide-gray-400 divide-x" : "divide-x divide-blue-200 dark:divide-blue-800"}`}>
                      <div className="w-6 flex items-center justify-center font-bold text-sm text-blue-800 dark:text-blue-400 print:text-black">P</div>
                      <div className="w-16 flex items-center px-1 text-xs font-medium text-blue-900 dark:text-blue-300 print:text-black">Pencha</div>
                      <div className="flex-1 flex items-center justify-center p-0.5 bg-white/50 dark:bg-slate-950/50">
                        {readOnly ? (
                          <span className="font-semibold text-sm">{measurements.trouser_pancha || "—"}</span>
                        ) : (
                          <Input type="number" step="0.25" min="0" placeholder="0" value={measurements.trouser_pancha || ""} onChange={(e) => setM?.('trouser_pancha', e.target.value)} className="h-full w-full px-1 text-center font-medium border-0 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-none bg-transparent" />
                        )}
                      </div>
                    </div>

                    {/* Tigh */}
                    <div className={`flex items-stretch h-8 ${readOnly ? "divide-gray-400 divide-x" : "divide-x divide-blue-200 dark:divide-blue-800"}`}>
                      <div className="w-6 flex items-center justify-center font-bold text-sm text-blue-800 dark:text-blue-400 print:text-black">T</div>
                      <div className="w-16 flex items-center px-1 text-xs font-medium text-blue-900 dark:text-blue-300 print:text-black">Tigh</div>
                      <div className="flex-1 flex items-center justify-center p-0.5 bg-white/50 dark:bg-slate-950/50">
                        {readOnly ? (
                          <span className="font-semibold text-sm">{measurements.trouser_thigh || "—"}</span>
                        ) : (
                          <Input type="number" step="0.25" min="0" placeholder="0" value={measurements.trouser_thigh || ""} onChange={(e) => setM?.('trouser_thigh', e.target.value)} className="h-full w-full px-1 text-center font-medium border-0 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-none bg-transparent" />
                        )}
                      </div>
                    </div>

                    {/* Waist — shown for Prince Coat / Simple Pent Coat (physical form shows waist in right col) */}
                    {isCoat && (
                      <div className={`flex items-stretch h-8 ${readOnly ? "divide-gray-400 divide-x" : "divide-x divide-blue-200 dark:divide-blue-800"}`}>
                        <div className="w-6 flex items-center justify-center font-bold text-sm text-blue-800 dark:text-blue-400 print:text-black">W</div>
                        <div className="w-16 flex items-center px-1 text-xs font-medium text-blue-900 dark:text-blue-300 print:text-black">waist</div>
                        <div className="flex-1 flex items-center justify-center p-0.5 bg-white/50 dark:bg-slate-950/50">
                          {readOnly ? (
                            <span className="font-semibold text-sm">{measurements.trouser_waist || "—"}</span>
                          ) : (
                            <Input type="number" step="0.25" min="0" placeholder="0" value={measurements.trouser_waist || ""} onChange={(e) => setM?.('trouser_waist', e.target.value)} className="h-full w-full px-1 text-center font-medium border-0 focus-visible:ring-1 focus-visible:ring-blue-500 rounded-none bg-transparent" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lastic */}
                    <div className={`flex items-stretch h-8 ${readOnly ? "divide-gray-400 divide-x" : "divide-x divide-blue-200 dark:divide-blue-800"}`}>
                      <div className="w-6 flex items-center justify-center font-bold text-sm text-blue-800 dark:text-blue-400 print:text-black">L</div>
                      <div className="w-16 flex items-center px-1 text-xs font-medium text-blue-900 dark:text-blue-300 print:text-black">Lastic</div>
                      <div className="flex-1 flex items-center justify-center bg-white/50 dark:bg-slate-950/50">
                        {readOnly ? (
                          <span className="text-lg leading-none">{stylingPrefs.trouser_elastic ? "☑" : "☐"}</span>
                        ) : (
                          <label className="cursor-pointer flex items-center justify-center w-full h-full group hover:bg-white dark:hover:bg-slate-900 transition-colors">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${stylingPrefs.trouser_elastic ? "bg-blue-600 border-blue-600 text-white" : "border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 group-hover:border-blue-400"}`}>
                              {stylingPrefs.trouser_elastic && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <input type="checkbox" className="hidden" checked={!!stylingPrefs.trouser_elastic} onChange={(e) => setS?.('trouser_elastic', e.target.checked)} />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Pocket */}
                    <div className={`flex items-stretch h-8 ${readOnly ? "divide-gray-400 divide-x border-b" : "divide-x divide-blue-200 dark:divide-blue-800 border-b border-blue-200 dark:border-blue-800"}`}>
                      <div className="w-6 flex items-center justify-center font-bold text-sm text-blue-800 dark:text-blue-400 print:text-black">P</div>
                      <div className="w-16 flex items-center px-1 text-xs font-medium text-blue-900 dark:text-blue-300 print:text-black">Pocket</div>
                      <div className="flex-1 flex items-center justify-center bg-white/50 dark:bg-slate-950/50">
                        {readOnly ? (
                          <span className="text-lg leading-none">{stylingPrefs.trouser_pocket ? "☑" : "☐"}</span>
                        ) : (
                          <label className="cursor-pointer flex items-center justify-center w-full h-full group hover:bg-white dark:hover:bg-slate-900 transition-colors">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${stylingPrefs.trouser_pocket ? "bg-blue-600 border-blue-600 text-white" : "border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 group-hover:border-blue-400"}`}>
                              {stylingPrefs.trouser_pocket && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <input type="checkbox" className="hidden" checked={!!stylingPrefs.trouser_pocket} onChange={(e) => setS?.('trouser_pocket', e.target.checked)} />
                          </label>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Zip Checkbox — omitted for Prince Coat */}
                {!isCoat && (
                  <div className="mt-3 flex items-center gap-2 pl-1">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-medium text-blue-900 dark:text-blue-300 print:text-black mb-1">Zip</span>
                      {readOnly ? (
                        <span className="text-lg leading-none">{stylingPrefs.zip ? "☑" : "☐"}</span>
                      ) : (
                        <label className="cursor-pointer group flex items-center justify-center">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${stylingPrefs.zip ? "bg-blue-600 border-blue-600 text-white" : "border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 group-hover:border-blue-400"}`}>
                            {stylingPrefs.zip && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <input type="checkbox" className="hidden" checked={!!stylingPrefs.zip} onChange={(e) => setS?.('zip', e.target.checked)} />
                        </label>
                      )}
                    </div>
                    <div className={`ml-2 w-12 h-6 border ${readOnly ? "border-gray-400" : "border-blue-200 dark:border-blue-800 bg-white/50 dark:bg-slate-950/50"}`}></div>
                  </div>
                )}

              </div>
              
              {/* Tailor Notes */}
              <div className={`p-3 pt-0`}>
                <Label className={`text-xs font-bold mb-1.5 block ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-300"}`}>Stitching Charges / Notes</Label>
                {readOnly ? (
                  <div className={`text-sm min-h-[80px] p-2 italic rounded ${readOnly ? "border border-gray-300 bg-transparent" : "bg-white/50 dark:bg-slate-950/50"}`}>
                    {notes || "No notes provided."}
                  </div>
                ) : (
                  <Textarea 
                    placeholder="Stitching Charges For trouser is 3000..." 
                    value={notes} 
                    onChange={(e) => setNotes?.(e.target.value)} 
                    className="min-h-[100px] text-xs resize-none bg-white/80 dark:bg-slate-950/80 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500"
                  />
                )}
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row w-full">
          {/* FEMALE TEMPLATE */}
          <div className={`flex-1 p-4 grid gap-3 border-blue-900/10 dark:border-blue-500/10 ${readOnly ? "border-r border-gray-400" : "border-r-2"}`}>
            {/* Top Block (Shirt) */}
            <div className={`space-y-3 pb-4 border-b-2 border-blue-900/10 dark:border-blue-500/10 ${readOnly ? "border-gray-400" : ""}`}>
              <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Length</div>
                <NumInput value={measurements.length} onChange={(v: string) => setM?.('length', v)} className="w-20" />
              </div>

              <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Shoulder</div>
                <NumInput value={measurements.shoulder} onChange={(v: string) => setM?.('shoulder', v)} className="w-20" />
              </div>

              <div className={`flex gap-2 items-end pb-3 flex-wrap ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Sleeves</div>
                <NumInput value={measurements.sleeves} onChange={(v: string) => setM?.('sleeves', v)} className="w-20 mr-2" />
                
                <NumInput label="arm hole Golai" value={measurements.arm_hole_golai} onChange={(v: string) => setM?.('arm_hole_golai', v)} className="w-20" />
                <NumInput label="Mori" value={measurements.mori} onChange={(v: string) => setM?.('mori', v)} className="w-20" />
                {/* Bell Bazoo: omitted for Saari */}
                {!isSaari && <CheckInput label="Bell Bazoo" checked={stylingPrefs.bell_bazoo} onChange={(v: boolean) => setS?.('bell_bazoo', v)} className="w-20 ml-2" />}
              </div>

              <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Neck</div>
                <NumInput value={measurements.neck} onChange={(v: string) => setM?.('neck', v)} className="w-20" />
              </div>

              <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Chest</div>
                <NumInput value={measurements.chest} onChange={(v: string) => setM?.('chest', v)} className="w-20" />
              </div>

              <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Waist</div>
                <NumInput value={measurements.waist} onChange={(v: string) => setM?.('waist', v)} className="w-20" />
              </div>

              {/* Hip row — Frock shows label as "Gherra" directly; all others show "Hip" */}
              <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">
                  {isFrock ? "Gherra" : "Hip"}
                </div>
                <NumInput value={isFrock ? measurements.gherra : measurements.hip} onChange={(v: string) => isFrock ? setM?.('gherra', v) : setM?.('hip', v)} className="w-20" />
              </div>

              {/* Chaak: omitted for Frock and Saari */}
              {!isFrock && !isSaari && (
                <div className="flex gap-4 items-end pb-1 mt-2">
                  <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Chaak</div>
                  <NumInput value={measurements.chaak} onChange={(v: string) => setM?.('chaak', v)} className="w-20" />
                </div>
              )}
            </div>

            {/* Bottom Block (Shalwars) — only shown for Ladies Shalwar Kameez (baseline) */}
            {showFemaleBottom && (
              <div className="space-y-4 pt-2">
                <div className={`flex gap-2 items-center pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                  <div className={`w-24 font-bold text-sm ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-400"}`}>B</div>
                  <div className="w-24 font-medium text-xs text-blue-900 dark:text-blue-300 print:text-black leading-tight">Simple<br/>Shalwar</div>
                  <NumInput label="Pancha" value={measurements.simple_shalwar_pancha} onChange={(v: string) => setM?.('simple_shalwar_pancha', v)} className="w-20" />
                  <NumInput label="Gherra" value={measurements.simple_shalwar_gherra} onChange={(v: string) => setM?.('simple_shalwar_gherra', v)} className="w-20" />
                  <CheckInput label="Lastic" checked={stylingPrefs.simple_shalwar_lastic} onChange={(v: boolean) => setS?.('simple_shalwar_lastic', v)} className="w-20 ml-2" />
                </div>
                <div className="flex gap-2 items-center pb-2">
                  <div className={`w-24 font-bold text-sm ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-400"}`}>B</div>
                  <div className="w-24 font-medium text-xs text-blue-900 dark:text-blue-300 print:text-black leading-tight">Shalwar Belt</div>
                  <NumInput label="Pancha" value={measurements.shalwar_belt_pancha} onChange={(v: string) => setM?.('shalwar_belt_pancha', v)} className="w-20" />
                  <NumInput label="Gherra" value={measurements.shalwar_belt_gherra} onChange={(v: string) => setM?.('shalwar_belt_gherra', v)} className="w-20" />
                  <CheckInput label="Lastic" checked={stylingPrefs.shalwar_belt_lastic} onChange={(v: boolean) => setS?.('shalwar_belt_lastic', v)} className="w-20 ml-2" />
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Trouser & Extras) */}
          <div className={`w-full md:w-64 p-4 flex flex-col justify-between ${readOnly ? "bg-transparent border-l border-gray-400" : "bg-blue-50/50 dark:bg-blue-950/20 border-l-2 border-blue-900/10 dark:border-blue-500/10"}`}>
            <div>
              <h4 className={`text-center font-semibold text-sm pb-2 mb-4 ${readOnly ? "text-black border-b border-gray-400" : "text-blue-900 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800"}`}>
                <span className={`font-bold mr-2 ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-400"}`}>B</span> {femaleRightLabel}
              </h4>
              
              <div className={`space-y-3 pl-4 relative ${readOnly ? "border-l-2 border-gray-300" : "border-l-2 border-blue-200 dark:border-blue-800"}`}>
                <div className="flex items-center justify-between gap-2">
                  <Label className={`text-xs font-medium ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-300"}`}>Length</Label>
                  {readOnly ? (
                    <span className="font-semibold px-2 py-0.5 border-b border-gray-400 min-w-[40px] text-center inline-block">{measurements.trouser_length || "—"}</span>
                  ) : (
                    <Input type="number" step="0.25" min="0" value={measurements.trouser_length || ""} onChange={(e) => setM?.('trouser_length', e.target.value)} className="h-8 text-sm px-2 font-medium bg-white/50 dark:bg-slate-950/50 w-20" />
                  )}
                </div>
                
                {/* Lehnga/Saari: only Length + Waist in right column. Frock/Shalwar Kameez: full trouser fields */}
                {femaleRightSimple ? (
                  <div className="flex items-center justify-between gap-2">
                    <Label className={`text-xs font-medium ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-300"}`}>waist</Label>
                    {readOnly ? (
                      <span className="font-semibold px-2 py-0.5 border-b border-gray-400 min-w-[40px] text-center inline-block">{measurements.trouser_waist || "—"}</span>
                    ) : (
                      <Input type="number" step="0.25" min="0" value={measurements.trouser_waist || ""} onChange={(e) => setM?.('trouser_waist', e.target.value)} className="h-8 text-sm px-2 font-medium bg-white/50 dark:bg-slate-950/50 w-20" />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <Label className={`text-xs font-medium ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-300"}`}>(Pencha) bottom</Label>
                      {readOnly ? (
                        <span className="font-semibold px-2 py-0.5 border-b border-gray-400 min-w-[40px] text-center inline-block">{measurements.trouser_pancha || "—"}</span>
                      ) : (
                        <Input type="number" step="0.25" min="0" value={measurements.trouser_pancha || ""} onChange={(e) => setM?.('trouser_pancha', e.target.value)} className="h-8 text-sm px-2 font-medium bg-white/50 dark:bg-slate-950/50 w-20" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className={`text-xs font-medium ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-300"}`}>thigh</Label>
                      {readOnly ? (
                        <span className="font-semibold px-2 py-0.5 border-b border-gray-400 min-w-[40px] text-center inline-block">{measurements.trouser_thigh || "—"}</span>
                      ) : (
                        <Input type="number" step="0.25" min="0" value={measurements.trouser_thigh || ""} onChange={(e) => setM?.('trouser_thigh', e.target.value)} className="h-8 text-sm px-2 font-medium bg-white/50 dark:bg-slate-950/50 w-20" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <Label className={`text-xs font-medium ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-300"}`}>Lastic waist</Label>
                      <CheckInput checked={stylingPrefs.trouser_elastic} onChange={(v: boolean) => setS?.('trouser_elastic', v)} className="" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Zip + Plate: omitted for Lehnga, Saari, Frock */}
              {showFemaleZip && (
                <div className={`flex items-center justify-end gap-3 pt-4 ${readOnly ? "border-t border-gray-400" : "border-t border-blue-200 dark:border-blue-800"}`}>
                  <CheckInput label="Zip" checked={stylingPrefs.zip} onChange={(v: boolean) => setS?.('zip', v)} className="w-16" />
                  <CheckInput label="Plate" checked={stylingPrefs.plate} onChange={(v: boolean) => setS?.('plate', v)} className="w-16" />
                </div>
              )}
              
              <div className="pt-2">
                <Label className={`text-xs font-medium mb-1 block ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-300"}`}>Tailor Notes</Label>
                {readOnly ? (
                  <div className="text-xs min-h-[40px] italic">
                    {notes || "No notes provided."}
                  </div>
                ) : (
                  <Textarea 
                    placeholder="e.g. Stitching Charges For trouser is 3000..." 
                    value={notes} 
                    onChange={(e) => setNotes?.(e.target.value)} 
                    className="min-h-[80px] text-xs resize-none bg-white/50 dark:bg-slate-950/50 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
