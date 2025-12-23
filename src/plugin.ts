import { dirname, resolve } from "path";
import type { PackageResult, PluginMeta, SkillGroup } from "./manifest";

/**
 * Walk up the directory tree from skillPath looking for plugin.json
 * Stops at 5 levels up maximum to avoid traversing too far
 *
 * @param skillPath - Absolute path to skill directory
 * @returns PluginMeta if plugin.json found, undefined otherwise
 */
export async function findPluginForSkill(
	skillPath: string,
): Promise<PluginMeta | undefined> {
	let currentPath = resolve(skillPath);
	const maxLevels = 5;

	for (let level = 0; level < maxLevels; level++) {
		const parentPath = dirname(currentPath);

		// Stop if we've reached the root
		if (parentPath === currentPath) {
			break;
		}

		currentPath = parentPath;
		const pluginJsonPath = resolve(currentPath, "plugin.json");

		try {
			const file = Bun.file(pluginJsonPath);
			if (await file.exists()) {
				const content = await file.text();
				const pluginData = JSON.parse(content) as Record<string, unknown>;

				// Validate required fields
				if (typeof pluginData.name !== "string") {
					console.warn(
						`plugin.json at ${pluginJsonPath} missing required 'name' field`,
					);
					continue;
				}

				const meta: PluginMeta = {
					name: pluginData.name,
					path: currentPath,
				};

				if (
					typeof pluginData.version === "string" &&
					pluginData.version.length > 0
				) {
					meta.version = pluginData.version;
				}

				return meta;
			}
		} catch (error) {
			// File doesn't exist or JSON parse failed, continue searching
			continue;
		}
	}

	return undefined;
}

/**
 * Group skills by their associated plugin
 * Skills without a pluginPath become individual standalone groups
 * Skills sharing the same pluginPath are grouped together under that plugin
 *
 * @param skills - Array of PackageResult with optional pluginPath
 * @returns Array of SkillGroups with plugin metadata populated
 */
export async function groupSkillsByPlugin(
	skills: Array<PackageResult & { pluginPath?: string }>,
): Promise<SkillGroup[]> {
	const pluginGroups = new Map<string | undefined, PackageResult[]>();

	// Group skills by pluginPath
	for (const skill of skills) {
		const key = skill.pluginPath;
		const existing = pluginGroups.get(key);

		if (existing) {
			existing.push(skill);
		} else {
			pluginGroups.set(key, [skill]);
		}
	}

	const groups: SkillGroup[] = [];

	// Create SkillGroup for each unique plugin or standalone skill
	for (const [pluginPath, groupSkills] of pluginGroups.entries()) {
		if (pluginPath) {
			// Has a plugin - read plugin.json to get metadata
			try {
				const pluginJsonPath = resolve(pluginPath, "plugin.json");
				const file = Bun.file(pluginJsonPath);
				const content = await file.text();
				const pluginData = JSON.parse(content) as Record<string, unknown>;

				if (typeof pluginData.name !== "string") {
					console.warn(
						`plugin.json at ${pluginJsonPath} missing required 'name' field, treating skills as standalone`,
					);
					// Treat as standalone
					for (const skill of groupSkills) {
						groups.push({ skills: [skill] });
					}
					continue;
				}

				const pluginMeta: PluginMeta = {
					name: pluginData.name,
					path: pluginPath,
				};

				if (
					typeof pluginData.version === "string" &&
					pluginData.version.length > 0
				) {
					pluginMeta.version = pluginData.version;
				}

				groups.push({
					plugin: pluginMeta,
					skills: groupSkills,
				});
			} catch (error) {
				console.warn(
					`Failed to read plugin.json at ${pluginPath}, treating skills as standalone:`,
					error,
				);
				// Treat as standalone
				for (const skill of groupSkills) {
					groups.push({ skills: [skill] });
				}
			}
		} else {
			// Standalone skills - each becomes its own group
			for (const skill of groupSkills) {
				groups.push({ skills: [skill] });
			}
		}
	}

	return groups;
}
