import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Measurement Sheets — Eman Threads",
  description:
    "A4 printable measurement sheets for men's and women's stitching — Shalwar Kameez, 3 Piece Suit, Prince Coat, Shirt, Ladies Frock, Lehnga Kurti, Saari Blouse.",
  robots: { index: false },
};

export default function MeasurementsLandingPage() {
  return (
    <div className="min-h-screen bg-[#e5e7eb] flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-[#172554] mb-4">
            Eman Threads — Measurement Sheets
          </h1>
          <p className="text-lg text-slate-600">
            Select a category to view A4 printable measurement forms
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Male */}
          <Link
            href="/measurements/male"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-slate-200 hover:border-[#172554]"
          >
            <div className="bg-[#172554] text-white py-6 px-8">
              <h2 className="text-2xl font-bold uppercase tracking-wider">Male</h2>
            </div>
            <div className="p-8">
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-700">
                  <span className="w-2 h-2 bg-[#b08d57] rounded-full" />
                  Men Shalwar Kameez
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <span className="w-2 h-2 bg-[#b08d57] rounded-full" />
                  Shirt
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <span className="w-2 h-2 bg-[#b08d57] rounded-full" />
                  Prince Coat 3 Piece Suit
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <span className="w-2 h-2 bg-[#b08d57] rounded-full" />
                  Simple 3 Piece Suit
                </li>
              </ul>
              <div className="mt-8 text-[#b08d57] font-semibold text-sm uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                Open Male Sheets →
              </div>
            </div>
          </Link>

          {/* Female */}
          <Link
            href="/measurements/female"
            className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-slate-200 hover:border-[#172554]"
          >
            <div className="bg-[#b08d57] text-white py-6 px-8">
              <h2 className="text-2xl font-bold uppercase tracking-wider">Female</h2>
            </div>
            <div className="p-8">
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-700">
                  <span className="w-2 h-2 bg-[#172554] rounded-full" />
                  Ladies Frock
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <span className="w-2 h-2 bg-[#172554] rounded-full" />
                  Ladies Shalwar Kameez
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <span className="w-2 h-2 bg-[#172554] rounded-full" />
                  Lehnga Kurti
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <span className="w-2 h-2 bg-[#172554] rounded-full" />
                  Saari Blouse
                </li>
              </ul>
              <div className="mt-8 text-[#172554] font-semibold text-sm uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                Open Female Sheets →
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-16 text-center text-sm text-slate-500">
          <p>Print-ready A4 format · 210mm × 297mm · Eman Threads theme</p>
        </div>
      </div>
    </div>
  );
}