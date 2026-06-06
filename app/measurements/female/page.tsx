import type { Metadata } from "next";
import { FemaleMeasurementPage } from "./components/FemaleMeasurementPage";

export const metadata: Metadata = {
  title: "Female Measurement Sheet",
  description:
    "Eman Threads female stitching measurement sheets — Ladies Frock, Shalwar Kameez, Lehnga Kurti, Saari Blouse. A4 printable.",
  robots: { index: false },
};

export default function FemaleMeasurementRoute() {
  return <FemaleMeasurementPage />;
}