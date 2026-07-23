import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'src/data/comala');
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));

const manifest = await readJson('manifest.json');
const loadMany = async (paths) => (await Promise.all(paths.map(readJson))).flat();
const dialogues = await loadMany(manifest.content.dialogues);
const events = await loadMany(manifest.content.events);
const characters = await loadMany(manifest.content.characters);
const items = await loadMany(manifest.content.items);
const quests = await loadMany(manifest.content.quests);
const endings = await loadMany(manifest.content.endings);

const dialogueIds = new Set(dialogues.map((entry) => entry.id));
const itemIds = new Set(items.map((entry) => entry.id));
const questIds = new Set(quests.map((entry) => entry.id));
const choiceIds = new Set();
const failures = [];
const requireReference = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const dialogue of dialogues) {
  const nodes = dialogue.nodes ?? [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodes.length) {
    requireReference(nodeIds.has(dialogue.start ?? nodes[0].id), `${dialogue.id}: start 节点不存在`);
  }
  for (const node of nodes) {
    if (node.next) requireReference(nodeIds.has(node.next), `${dialogue.id}/${node.id}: next=${node.next} 不存在`);
    for (const branch of node.branches ?? []) {
      requireReference(nodeIds.has(branch.next), `${dialogue.id}/${node.id}: branch.next=${branch.next} 不存在`);
    }
    for (const choice of node.choices ?? []) {
      requireReference(Boolean(choice.id), `${dialogue.id}/${node.id}: choice 缺少稳定 id`);
      requireReference(!choiceIds.has(choice.id), `choiceId 重复：${choice.id}`);
      choiceIds.add(choice.id);
      if (choice.next) requireReference(nodeIds.has(choice.next), `${dialogue.id}/${node.id}: choice.next=${choice.next} 不存在`);
    }
  }
}

for (const character of characters) {
  requireReference(dialogueIds.has(character.dialogueId), `${character.id}: dialogueId=${character.dialogueId} 不存在`);
}
for (const event of events) {
  if (event.dialogueId) requireReference(dialogueIds.has(event.dialogueId), `${event.id}: dialogueId=${event.dialogueId} 不存在`);
  for (const reward of event.rewards ?? []) {
    requireReference(itemIds.has(reward), `${event.id}: reward=${reward} 不存在`);
  }
}
for (const quest of quests) {
  if (quest.nextQuest) requireReference(questIds.has(quest.nextQuest), `${quest.id}: nextQuest=${quest.nextQuest} 不存在`);
  for (const reward of quest.rewards?.items ?? []) {
    requireReference(itemIds.has(reward.id), `${quest.id}: reward=${reward.id} 不存在`);
  }
}
for (const ending of endings) {
  requireReference(dialogueIds.has(ending.dialogueId), `${ending.id}: dialogueId=${ending.dialogueId} 不存在`);
}

const serialized = JSON.stringify({ manifest, dialogues, events, characters, items, quests, endings });
for (const legacyId of ['qingxuan_temple', 'grave_talisman', 'accepted_evil_rite', 'all_fragments', 'spiritualSense']) {
  requireReference(!serialized.includes(legacyId), `新内容包仍引用旧主题 ID：${legacyId}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`内容引用有效：${dialogues.length} 组对话，${choiceIds.size} 个选择，${events.length} 个事件，${endings.length} 个结局。`);
}

