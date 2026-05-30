const fetch = require("node-fetch");

async function main() {
  // First, read the current categories via GET
  const getRes = await fetch("http://localhost:3000/api/admin/featured-categories");
  const getData = await getRes.json();
  console.log("GET categories count:", getData.categories ? getData.categories.length : "none");
  console.log("Error if any:", getData.error);

  if (!getData.categories) return;

  const categories = getData.categories;
  categories.pop(); // Remove one

  console.log("Attempting PUT with count:", categories.length);

  // Send PUT
  const putRes = await fetch("http://localhost:3000/api/admin/featured-categories", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ categories })
  });

  const putData = await putRes.json();
  console.log("PUT response status:", putRes.status);
  console.log("PUT response body:", putData);
}

main().catch(console.error);
