import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface UnifiedLayoutEngineProps {
  gender: "male" | "female";
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
          <Label className="text-xs text-blue-800 dark:text-blue-300 font-medium cursor-pointer">
            {label}
          </Label>
          <span className="text-lg leading-none">{checked ? "☑" : "☐"}</span>
        </div>
      );
    }
    return (
      <label className={`flex flex-col items-center gap-1 cursor-pointer group ${className}`}>
        <span className="text-xs text-blue-800 dark:text-blue-300 font-medium">{label}</span>
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
          ${checked ? "bg-blue-600 border-blue-600 text-white" : "border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 group-hover:border-blue-400"}
        `}>
          {checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <input type="checkbox" className="hidden" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} />
      </label>
    );
  };

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

            {/* Row 3: Sleeves */}
            <div className={`flex gap-2 items-end pb-3 flex-wrap ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Sleeves</div>
              <NumInput value={measurements.sleeves} onChange={(v: string) => setM?.('sleeves', v)} className="w-20 mr-2" />
              
              <NumInput label="arm hole Golai" value={measurements.arm_hole_golai} onChange={(v: string) => setM?.('arm_hole_golai', v)} className="w-16" />
              <NumInput label="Caff" value={measurements.caff} onChange={(v: string) => setM?.('caff', v)} className="w-16" />
              <NumInput label="Caff Plate" value={measurements.caff_plate} onChange={(v: string) => setM?.('caff_plate', v)} className="w-16" />
              <CheckInput label="Gol Bazoo" checked={stylingPrefs.gol_bazoo} onChange={(v: boolean) => setS?.('gol_bazoo', v)} className="w-14" />
              <div className="flex gap-1 ml-2">
                <CheckInput label="Double" checked={stylingPrefs.sleeve_stitching === 'DOUBLE'} onChange={(v: boolean) => v && setS?.('sleeve_stitching', 'DOUBLE')} className="w-14" />
                <CheckInput label="Single" checked={stylingPrefs.sleeve_stitching === 'SINGLE'} onChange={(v: boolean) => v && setS?.('sleeve_stitching', 'SINGLE')} className="w-14" />
              </div>
            </div>

            {/* Row 4: Neck */}
            <div className={`flex gap-2 items-end pb-3 flex-wrap ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Neck</div>
              <NumInput value={measurements.neck} onChange={(v: string) => setM?.('neck', v)} className="w-20 mr-2" />
              
              <CheckInput label="Patti" checked={stylingPrefs.patti} onChange={(v: boolean) => setS?.('patti', v)} className="w-12" />
              <CheckInput label="Bane" checked={stylingPrefs.bane} onChange={(v: boolean) => setS?.('bane', v)} className="w-12" />
              <CheckInput label="Nok" checked={stylingPrefs.nok} onChange={(v: boolean) => setS?.('nok', v)} className="w-12" />
              <CheckInput label="Collar" checked={stylingPrefs.collar} onChange={(v: boolean) => setS?.('collar', v)} className="w-12" />
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

            {/* Row 7: Gherra */}
            <div className={`flex gap-2 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Gherra</div>
              <NumInput value={measurements.gherra} onChange={(v: string) => setM?.('gherra', v)} className="w-20 mr-2" />
              
              <CheckInput label="Gol" checked={stylingPrefs.shalwar_type === 'GOL'} onChange={(v: boolean) => v && setS?.('shalwar_type', 'GOL')} className="w-14" />
              <CheckInput label="Choras" checked={stylingPrefs.shalwar_type === 'CHORAS'} onChange={(v: boolean) => v && setS?.('shalwar_type', 'CHORAS')} className="w-14" />
            </div>

            {/* Row 8: Shalwar */}
            <div className={`flex gap-2 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Shalwar</div>
              <NumInput value={measurements.shalwar} onChange={(v: string) => setM?.('shalwar', v)} className="w-20 mr-2" />
              
              <NumInput label="Gherra" value={measurements.shalwar_gherra} onChange={(v: string) => setM?.('shalwar_gherra', v)} className="w-16" />
              <NumInput label="Assan" value={measurements.shalwar_assan} onChange={(v: string) => setM?.('shalwar_assan', v)} className="w-16" />
            </div>

            {/* Row 9: Pancha */}
            <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Pancha</div>
              <NumInput value={measurements.pancha} onChange={(v: string) => setM?.('pancha', v)} className="w-20" />
            </div>

            {/* Row 10: Pocket */}
            <div className="flex gap-2 items-end mt-2">
              <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Pocket</div>
              <div className="w-20 mr-2" /> {/* alignment spacer */}
              
              <CheckInput label="Front" checked={stylingPrefs.pocket_front} onChange={(v: boolean) => setS?.('pocket_front', v)} className="w-14" />
              <CheckInput label="Side" checked={stylingPrefs.pocket_side} onChange={(v: boolean) => setS?.('pocket_side', v)} className="w-14" />
              <CheckInput label="Shalwar" checked={stylingPrefs.pocket_shalwar} onChange={(v: boolean) => setS?.('pocket_shalwar', v)} className="w-14" />
            </div>
          </div>

          {/* Right Column (Trouser & Extras) */}
          <div className={`w-full md:w-64 p-4 flex flex-col justify-between ${readOnly ? "bg-transparent" : "bg-blue-50/50 dark:bg-blue-950/20"}`}>
            <div>
              <h4 className={`text-center font-semibold text-sm pb-2 mb-4 ${readOnly ? "text-black border-b border-gray-400" : "text-blue-900 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800"}`}>
                Pent / Trouser
              </h4>
              
              <div className={`space-y-3 pl-4 relative ${readOnly ? "border-l-2 border-gray-300" : "border-l-2 border-blue-200 dark:border-blue-800"}`}>
                <div className="flex items-center gap-3">
                  <span className={`font-bold w-4 ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-400"}`}>L</span>
                  <NumInput label="Length" value={measurements.trouser_length} onChange={(v: string) => setM?.('trouser_length', v)} className="w-20 flex-row items-center gap-2" />
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold w-4 ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-400"}`}>P</span>
                  <NumInput label="Pencha" value={measurements.trouser_pancha} onChange={(v: string) => setM?.('trouser_pancha', v)} className="w-20 flex-row items-center gap-2" />
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold w-4 ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-400"}`}>T</span>
                  <NumInput label="Tigh" value={measurements.trouser_thigh} onChange={(v: string) => setM?.('trouser_thigh', v)} className="w-20 flex-row items-center gap-2" />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`font-bold w-4 ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-400"}`}>L</span>
                  <CheckInput label="Lastic" checked={stylingPrefs.trouser_elastic} onChange={(v: boolean) => setS?.('trouser_elastic', v)} className="w-20 flex-row items-center gap-2 justify-start py-0.5" />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`font-bold w-4 ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-400"}`}>P</span>
                  <CheckInput label="Pocket" checked={stylingPrefs.trouser_pocket} onChange={(v: boolean) => setS?.('trouser_pocket', v)} className="w-20 flex-row items-center gap-2 justify-start py-0.5" />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-end">
                <CheckInput label="Zip" checked={stylingPrefs.zip} onChange={(v: boolean) => setS?.('zip', v)} className="w-16" />
              </div>
              
              <div className={`pt-4 border-t ${readOnly ? "border-gray-400" : "border-blue-200 dark:border-blue-800"}`}>
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
                    className="min-h-[80px] text-xs resize-none bg-white/50 dark:bg-slate-950/50"
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
                <CheckInput label="Bell Bazoo" checked={stylingPrefs.bell_bazoo} onChange={(v: boolean) => setS?.('bell_bazoo', v)} className="w-20 ml-2" />
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

              <div className={`flex gap-4 items-end pb-3 ${readOnly ? "border-b border-gray-300" : "border-b border-blue-100 dark:border-blue-900/30"}`}>
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Hip</div>
                <NumInput value={measurements.hip} onChange={(v: string) => setM?.('hip', v)} className="w-20" />
              </div>

              <div className="flex gap-4 items-end pb-1 mt-2">
                <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300 print:text-black">Chaak</div>
                <NumInput value={measurements.chaak} onChange={(v: string) => setM?.('chaak', v)} className="w-20" />
              </div>
            </div>

            {/* Bottom Block (Shalwars) */}
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
          </div>

          {/* Right Column (Trouser & Extras) */}
          <div className={`w-full md:w-64 p-4 flex flex-col justify-between ${readOnly ? "bg-transparent" : "bg-blue-50/50 dark:bg-blue-950/20"}`}>
            <div>
              <h4 className={`text-center font-semibold text-sm pb-2 mb-4 ${readOnly ? "text-black border-b border-gray-400" : "text-blue-900 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800"}`}>
                <span className={`font-bold mr-2 ${readOnly ? "text-black" : "text-blue-800 dark:text-blue-400"}`}>B</span> Trouser
              </h4>
              
              <div className={`space-y-3 pl-4 relative ${readOnly ? "border-l-2 border-gray-300" : "border-l-2 border-blue-200 dark:border-blue-800"}`}>
                <div className="flex items-center gap-3">
                  <NumInput label="Length" value={measurements.trouser_length} onChange={(v: string) => setM?.('trouser_length', v)} className="w-28 flex-row items-center gap-2" />
                </div>
                <div className="flex items-center gap-3">
                  <NumInput label="(Pencha) bottom" value={measurements.trouser_pancha} onChange={(v: string) => setM?.('trouser_pancha', v)} className="w-28 flex-row items-center gap-2" />
                </div>
                <div className="flex items-center gap-3">
                  <NumInput label="thigh" value={measurements.trouser_thigh} onChange={(v: string) => setM?.('trouser_thigh', v)} className="w-28 flex-row items-center gap-2" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <CheckInput label="Lastic waist" checked={stylingPrefs.trouser_elastic} onChange={(v: boolean) => setS?.('trouser_elastic', v)} className="w-28 flex-row items-center gap-2 justify-start py-0.5" />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className={`flex items-center justify-end gap-3 pt-4 ${readOnly ? "border-t border-gray-400" : "border-t border-blue-200 dark:border-blue-800"}`}>
                <CheckInput label="Zip" checked={stylingPrefs.zip} onChange={(v: boolean) => setS?.('zip', v)} className="w-16" />
                <CheckInput label="Plate" checked={stylingPrefs.plate} onChange={(v: boolean) => setS?.('plate', v)} className="w-16" />
              </div>
              
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
                    className="min-h-[80px] text-xs resize-none bg-white/50 dark:bg-slate-950/50"
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
