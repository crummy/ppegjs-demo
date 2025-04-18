import type { Metadata } from "ppegjs";

export function generateOutput(tree: Metadata) {
  const treeRoot = document.createElement("ul");
  treeRoot.appendChild(appendOutput(tree));
  return treeRoot;
}

function appendOutput(tree: Metadata) {
  // Create the list item to hold this node
  const item = document.createElement("li");
  item.classList.add("tree-node");

  // Add the rule name as the node label with proper attributes
  const label = document.createElement("span");
  label.classList.add("node-label");
  if (!tree.error) {
    label.textContent = tree.rule;
    if (tree.match) {
      label.textContent += `: ${tree.match}`;
    }
  } else {
    item.classList.add("error");
    label.textContent += `${tree.error.type}: ${tree.error.message}`;
  }
  label.dataset.rule = tree.rule;
  label.dataset.matchid = tree.id?.toString();

  // Add event listeners for highlighting
  label.addEventListener("mouseover", () => {
    document
      .querySelectorAll(
        `#input [data-matchid='${tree.id}'], #grammar [data-rule='${tree.rule}']`,
      )
      .forEach((el) => el.classList.add("highlighted"));
    label.classList.add("highlighted");
  });

  label.addEventListener("mouseleave", () => {
    document
      .querySelectorAll(
        `#input [data-matchid='${tree.id}'], #grammar [data-rule='${tree.rule}']`,
      )
      .forEach((el) => el.classList.remove("highlighted"));
    label.classList.remove("highlighted");
  });

  item.appendChild(label);

  // Add children if they exist
  if (tree.children && tree.children.length > 0) {
    const childList = document.createElement("ul");
    childList.classList.add("tree-children");

    for (let leaf of tree.children) {
      childList.appendChild(appendOutput(leaf));
    }

    item.appendChild(childList);
  }

  return item;
}
