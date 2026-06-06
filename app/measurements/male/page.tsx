import type { Metadata } from "next";
import { MeasurementPage } from "./components/MeasurementPage";

export const metadata: Metadata = {
  title: "Male Measurement Sheet",
  description:
    "Eman Threads male stitching measurement sheets — Shalwar Kameez, 3 Piece Suit, Prince Coat, Shirt. A4 printable.",
  robots: { index: false }, // internal tailor tool — no need to index
};

export default function MaleMeasurementRoute() {
  return <MeasurementPage />;
}
