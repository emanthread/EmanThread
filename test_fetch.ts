import fs from 'fs'

async function run() {
  const payload = {
    phone: "03200189003",
    customerName: "Ahmed test edit",
    garmentType: "male_shalwar_kameez",
    gender: "Male",
    notes: "",
    length1: "42",
    length2: "",
    // just send these for now
  }

  const res = await fetch('http://localhost:3000/api/admin/customer-measurements/c58697a5-b105-41a1-876d-4a5541dda569', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  console.log(res.status)
  console.log(await res.text())
}
run()
