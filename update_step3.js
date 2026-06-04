const fs = require('fs');
const file = 'd:\\Eman Thread\\app\\account\\measurements\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('{step === 3 && (');
const endIdx = content.indexOf('<div className="flex justify-between pt-4 border-t">');

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find step 3 bounds");
  process.exit(1);
}

const replacement = `{step === 3 && (
          <div className="mt-2 border-2 border-blue-900/30 dark:border-blue-500/30 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm text-blue-950 dark:text-blue-100">
            {/* Header Area */}
            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 border-b-2 border-blue-900/20 dark:border-blue-500/20 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-900 dark:bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  EC
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight uppercase">EMAN THREADS</h2>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium tracking-widest">
                    {gender === "male" ? "MEN " : "LADIES "} 
                    {category ? category.replace(/_/g, " ").toUpperCase() : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded border border-blue-200 dark:border-blue-800">
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 mr-2">Name:</span>
                  <span className="text-sm font-medium">{profileName || "________________"}</span>
                </div>
              </div>
            </div>

            {/* Main Form Body */}
            {gender === "male" ? (
              <div className="flex flex-col md:flex-row">
                {/* Left Column (Shirt & Shalwar) */}
                <div className="flex-1 p-4 grid gap-3 border-r-2 border-blue-900/10 dark:border-blue-500/10">
                  {/* Row 1: Length */}
                  <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Length</div>
                    <NumInput value={measurements.length} onChange={(v: string) => setM('length', v)} className="w-20" />
                  </div>

                  {/* Row 2: Shoulder */}
                  <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Shoulder</div>
                    <NumInput value={measurements.shoulder} onChange={(v: string) => setM('shoulder', v)} className="w-20" />
                  </div>

                  {/* Row 3: Sleeves */}
                  <div className="flex gap-2 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3 flex-wrap">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Sleeves</div>
                    <NumInput value={measurements.sleeves} onChange={(v: string) => setM('sleeves', v)} className="w-20 mr-2" />
                    
                    <NumInput label="arm hole Golai" value={measurements.arm_hole_golai} onChange={(v: string) => setM('arm_hole_golai', v)} className="w-16" />
                    <NumInput label="Caff" value={measurements.caff} onChange={(v: string) => setM('caff', v)} className="w-16" />
                    <NumInput label="Caff Plate" value={measurements.caff_plate} onChange={(v: string) => setM('caff_plate', v)} className="w-16" />
                    <CheckInput label="Gol Bazoo" checked={stylingPrefs.gol_bazoo} onChange={(v: boolean) => setS('gol_bazoo', v)} className="w-14" />
                    <div className="flex gap-1">
                      <CheckInput label="Double" checked={stylingPrefs.sleeve_stitching === 'DOUBLE'} onChange={(v: boolean) => v && setS('sleeve_stitching', 'DOUBLE')} className="w-14" />
                      <CheckInput label="Single" checked={stylingPrefs.sleeve_stitching === 'SINGLE'} onChange={(v: boolean) => v && setS('sleeve_stitching', 'SINGLE')} className="w-14" />
                    </div>
                  </div>

                  {/* Row 4: Neck */}
                  <div className="flex gap-2 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3 flex-wrap">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Neck</div>
                    <NumInput value={measurements.neck} onChange={(v: string) => setM('neck', v)} className="w-20 mr-2" />
                    
                    <CheckInput label="Patti" checked={stylingPrefs.patti} onChange={(v: boolean) => setS('patti', v)} className="w-12" />
                    <CheckInput label="Bane" checked={stylingPrefs.bane} onChange={(v: boolean) => setS('bane', v)} className="w-12" />
                    <CheckInput label="Nok" checked={stylingPrefs.nok} onChange={(v: boolean) => setS('nok', v)} className="w-12" />
                    <CheckInput label="Collar" checked={stylingPrefs.collar} onChange={(v: boolean) => setS('collar', v)} className="w-12" />
                  </div>

                  {/* Row 5: Chest */}
                  <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Chest</div>
                    <NumInput value={measurements.chest} onChange={(v: string) => setM('chest', v)} className="w-20" />
                  </div>

                  {/* Row 6: Waist */}
                  <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Waist</div>
                    <NumInput value={measurements.waist} onChange={(v: string) => setM('waist', v)} className="w-20" />
                  </div>

                  {/* Row 7: Gherra */}
                  <div className="flex gap-2 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Gherra</div>
                    <NumInput value={measurements.gherra} onChange={(v: string) => setM('gherra', v)} className="w-20 mr-2" />
                    
                    <CheckInput label="Gol" checked={stylingPrefs.shalwar_type === 'GOL'} onChange={(v: boolean) => v && setS('shalwar_type', 'GOL')} className="w-14" />
                    <CheckInput label="Choras" checked={stylingPrefs.shalwar_type === 'CHORAS'} onChange={(v: boolean) => v && setS('shalwar_type', 'CHORAS')} className="w-14" />
                  </div>

                  {/* Row 8: Shalwar */}
                  <div className="flex gap-2 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Shalwar</div>
                    <NumInput value={measurements.shalwar} onChange={(v: string) => setM('shalwar', v)} className="w-20 mr-2" />
                    
                    <NumInput label="Gherra" value={measurements.shalwar_gherra} onChange={(v: string) => setM('shalwar_gherra', v)} className="w-16" />
                    <NumInput label="Assan" value={measurements.shalwar_assan} onChange={(v: string) => setM('shalwar_assan', v)} className="w-16" />
                  </div>

                  {/* Row 9: Pancha */}
                  <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Pancha</div>
                    <NumInput value={measurements.pancha} onChange={(v: string) => setM('pancha', v)} className="w-20" />
                  </div>

                  {/* Row 10: Pocket */}
                  <div className="flex gap-2 items-end">
                    <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Pocket</div>
                    <div className="w-20 mr-2" /> {/* alignment spacer */}
                    
                    <CheckInput label="Front" checked={stylingPrefs.pocket_front} onChange={(v: boolean) => setS('pocket_front', v)} className="w-14" />
                    <CheckInput label="Side" checked={stylingPrefs.pocket_side} onChange={(v: boolean) => setS('pocket_side', v)} className="w-14" />
                    <CheckInput label="Shalwar" checked={stylingPrefs.pocket_shalwar} onChange={(v: boolean) => setS('pocket_shalwar', v)} className="w-14" />
                  </div>
                </div>

                {/* Right Column (Trouser & Extras) */}
                <div className="w-full md:w-64 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-center font-semibold text-blue-900 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800 pb-2 mb-4 text-sm">
                      Pent / Trouser
                    </h4>
                    
                    <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800 relative">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-800 dark:text-blue-400 w-4">L</span>
                        <NumInput label="Length" value={measurements.trouser_length} onChange={(v: string) => setM('trouser_length', v)} className="w-20 flex-row items-center gap-2" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-800 dark:text-blue-400 w-4">P</span>
                        <NumInput label="Pencha" value={measurements.trouser_pancha} onChange={(v: string) => setM('trouser_pancha', v)} className="w-20 flex-row items-center gap-2" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-800 dark:text-blue-400 w-4">T</span>
                        <NumInput label="Tigh" value={measurements.trouser_thigh} onChange={(v: string) => setM('trouser_thigh', v)} className="w-20 flex-row items-center gap-2" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-800 dark:text-blue-400 w-4">L</span>
                        <CheckInput label="Lastic" checked={stylingPrefs.trouser_elastic} onChange={(v: boolean) => setS('trouser_elastic', v)} className="w-20 flex-row items-center gap-2 justify-start py-0.5" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-800 dark:text-blue-400 w-4">P</span>
                        <CheckInput label="Pocket" checked={stylingPrefs.trouser_pocket} onChange={(v: boolean) => setS('trouser_pocket', v)} className="w-20 flex-row items-center gap-2 justify-start py-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-end">
                      <CheckInput label="Zip" checked={stylingPrefs.zip} onChange={(v: boolean) => setS('zip', v)} className="w-16" />
                    </div>
                    
                    <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
                      <Label className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1 block">Tailor Notes</Label>
                      <Textarea 
                        placeholder="e.g. Stitching Charges For trouser is 3000..." 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        className="min-h-[80px] text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row">
                {/* FEMALE TEMPLATE */}
                <div className="flex-1 p-4 grid gap-3 border-r-2 border-blue-900/10 dark:border-blue-500/10">
                  {/* Top Block (Shirt) */}
                  <div className="space-y-3 pb-4 border-b-2 border-blue-900/10 dark:border-blue-500/10">
                    <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                      <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Length</div>
                      <NumInput value={measurements.length} onChange={(v: string) => setM('length', v)} className="w-20" />
                    </div>

                    <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                      <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Shoulder</div>
                      <NumInput value={measurements.shoulder} onChange={(v: string) => setM('shoulder', v)} className="w-20" />
                    </div>

                    <div className="flex gap-2 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3 flex-wrap">
                      <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Sleeves</div>
                      <NumInput value={measurements.sleeves} onChange={(v: string) => setM('sleeves', v)} className="w-20 mr-2" />
                      
                      <NumInput label="arm hole Golai" value={measurements.arm_hole_golai} onChange={(v: string) => setM('arm_hole_golai', v)} className="w-20" />
                      <NumInput label="Mori" value={measurements.mori} onChange={(v: string) => setM('mori', v)} className="w-20" />
                      <CheckInput label="Bell Bazoo" checked={stylingPrefs.bell_bazoo} onChange={(v: boolean) => setS('bell_bazoo', v)} className="w-20" />
                    </div>

                    <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                      <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Neck</div>
                      <NumInput value={measurements.neck} onChange={(v: string) => setM('neck', v)} className="w-20" />
                    </div>

                    <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                      <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Chest</div>
                      <NumInput value={measurements.chest} onChange={(v: string) => setM('chest', v)} className="w-20" />
                    </div>

                    <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                      <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Waist</div>
                      <NumInput value={measurements.waist} onChange={(v: string) => setM('waist', v)} className="w-20" />
                    </div>

                    <div className="flex gap-4 items-end border-b border-blue-100 dark:border-blue-900/30 pb-3">
                      <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Hip</div>
                      <NumInput value={measurements.hip} onChange={(v: string) => setM('hip', v)} className="w-20" />
                    </div>

                    <div className="flex gap-4 items-end pb-1">
                      <div className="w-24 font-medium text-sm text-blue-900 dark:text-blue-300">Chaak</div>
                      <NumInput value={measurements.chaak} onChange={(v: string) => setM('chaak', v)} className="w-20" />
                    </div>
                  </div>

                  {/* Bottom Block (Shalwars) */}
                  <div className="space-y-4 pt-2">
                    <div className="flex gap-2 items-center border-b border-blue-100 dark:border-blue-900/30 pb-3">
                      <div className="w-24 font-bold text-sm text-blue-800 dark:text-blue-400">B</div>
                      <div className="w-24 font-medium text-xs text-blue-900 dark:text-blue-300 leading-tight">Simple<br/>Shalwar</div>
                      <NumInput label="Pancha" value={measurements.simple_shalwar_pancha} onChange={(v: string) => setM('simple_shalwar_pancha', v)} className="w-20" />
                      <NumInput label="Gherra" value={measurements.simple_shalwar_gherra} onChange={(v: string) => setM('simple_shalwar_gherra', v)} className="w-20" />
                      <CheckInput label="Lastic" checked={stylingPrefs.simple_shalwar_lastic} onChange={(v: boolean) => setS('simple_shalwar_lastic', v)} className="w-20 py-1" />
                    </div>

                    <div className="flex gap-2 items-center pb-2">
                      <div className="w-24 font-bold text-sm text-blue-800 dark:text-blue-400">B</div>
                      <div className="w-24 font-medium text-xs text-blue-900 dark:text-blue-300 leading-tight">Shalwar Belt</div>
                      <NumInput label="Pancha" value={measurements.shalwar_belt_pancha} onChange={(v: string) => setM('shalwar_belt_pancha', v)} className="w-20" />
                      <NumInput label="Gherra" value={measurements.shalwar_belt_gherra} onChange={(v: string) => setM('shalwar_belt_gherra', v)} className="w-20" />
                      <CheckInput label="Lastic" checked={stylingPrefs.shalwar_belt_lastic} onChange={(v: boolean) => setS('shalwar_belt_lastic', v)} className="w-20 py-1" />
                    </div>
                  </div>
                </div>

                {/* Right Column (Trouser & Extras) */}
                <div className="w-full md:w-64 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-center font-semibold text-blue-900 dark:text-blue-300 border-b border-blue-200 dark:border-blue-800 pb-2 mb-4 text-sm">
                      <span className="font-bold text-blue-800 dark:text-blue-400 mr-2">B</span> Trouser
                    </h4>
                    
                    <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800 relative">
                      <div className="flex items-center gap-3">
                        <NumInput label="Length" value={measurements.trouser_length} onChange={(v: string) => setM('trouser_length', v)} className="w-28 flex-row items-center gap-2" />
                      </div>
                      <div className="flex items-center gap-3">
                        <NumInput label="(Pencha) bottom" value={measurements.trouser_pancha} onChange={(v: string) => setM('trouser_pancha', v)} className="w-28 flex-row items-center gap-2" />
                      </div>
                      <div className="flex items-center gap-3">
                        <NumInput label="thigh" value={measurements.trouser_thigh} onChange={(v: string) => setM('trouser_thigh', v)} className="w-28 flex-row items-center gap-2" />
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckInput label="Lastic waist" checked={stylingPrefs.trouser_elastic} onChange={(v: boolean) => setS('trouser_elastic', v)} className="w-28 flex-row items-center gap-2 justify-start py-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-end gap-3 border-t border-blue-200 dark:border-blue-800 pt-4">
                      <CheckInput label="Zip" checked={stylingPrefs.zip} onChange={(v: boolean) => setS('zip', v)} className="w-16" />
                      <CheckInput label="Plate" checked={stylingPrefs.plate} onChange={(v: boolean) => setS('plate', v)} className="w-16" />
                    </div>
                    
                    <div className="pt-2">
                      <Label className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1 block">Tailor Notes</Label>
                      <Textarea 
                        placeholder="e.g. Stitching Charges For trouser is 3000..." 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        className="min-h-[80px] text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
`;

const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(file, newContent);
console.log("Updated step 3 block successfully");
