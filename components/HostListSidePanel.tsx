/**
 * HostListSidePanel - Host/session browser rendered as a side panel tab
 *
 * Displays all hosts and groups in a tree view, with right-click context menus
 * for creating groups/hosts, double-click to connect, and right-click to edit.
 *
 * Reuses HostTreeView from the vault for consistent UX.
 *
 * customGroups (group paths) is read from localStorage since it's persisted
 * there by useVaultState — avoids threading it through TerminalLayer props.
 */
import React, { memo, useCallback, useMemo } from "react";
import { useI18n } from "../application/i18n/I18nProvider";
import { useTreeExpandedState } from "../application/state/useTreeExpandedState";
import { STORAGE_KEY_VAULT_HOSTS_TREE_EXPANDED } from "../infrastructure/config/storageKeys";
import { GroupConfig, GroupNode, Host } from "../types";
import { HostTreeView } from "./HostTreeView";
import { Server } from "lucide-react";

interface HostListSidePanelProps {
  hosts: Host[];
  groupConfigs: GroupConfig[];
  customGroups: string[];
  onConnectHost: (host: Host) => void;
  onEditHost: (host: Host) => void;
  onNewHost: (groupPath?: string) => void;
  onNewGroup: (parentPath?: string) => void;
  onEditGroup: (groupPath: string) => void;
  onDeleteGroup: (groupPath: string) => void;
  onDuplicateHost: (host: Host) => void;
  onDeleteHost: (host: Host) => void;
  onCopyCredentials: (host: Host) => void;
  updateHosts: (hosts: Host[]) => void;
  moveHost?: (hostId: string, targetGroup: string) => void;
  moveGroup?: (sourcePath: string, targetPath: string) => void;
}

function buildGroupTree(hosts: Host[], customGroups: string[]): GroupNode[] {
  const root: Record<string, GroupNode> = {};

  const insertPath = (path: string, host?: Host) => {
    const parts = path.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!currentLevel[part]) {
        currentLevel[part] = {
          name: part,
          path: currentPath,
          children: {},
          hosts: [],
        };
      }
      if (host && index === parts.length - 1)
        currentLevel[part].hosts.push(host);
      currentLevel = currentLevel[part].children;
    });
  };

  customGroups.forEach((path) => insertPath(path));
  hosts.forEach((host) => {
    if (host.group && host.group.trim() !== "") {
      insertPath(host.group, host);
    }
  });

  return (Object.values(root) as GroupNode[]).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

const HostListSidePanelInner: React.FC<HostListSidePanelProps> = ({
  hosts,
  groupConfigs,
  customGroups,
  onConnectHost,
  onEditHost,
  onNewHost,
  onNewGroup,
  onEditGroup,
  onDeleteGroup,
  onDuplicateHost,
  onDeleteHost,
  onCopyCredentials,
  updateHosts,
}) => {
  const { t } = useI18n();

  const groupTree = useMemo(
    () => buildGroupTree(hosts, customGroups),
    [hosts, customGroups],
  );

  const treeExpandedState = useTreeExpandedState(
    STORAGE_KEY_VAULT_HOSTS_TREE_EXPANDED,
  );

  const handleConnect = useCallback(
    (host: Host) => {
      onConnectHost(host);
    },
    [onConnectHost],
  );

  const handleEdit = useCallback(
    (host: Host) => {
      onEditHost(host);
    },
    [onEditHost],
  );

  const moveHostToGroup = useCallback(
    (hostId: string, groupPath: string | null) => {
      const host = hosts.find((h) => h.id === hostId);
      if (!host) return;
      const updated = { ...host, group: groupPath ?? "" };
      const newHosts = hosts.map((h) => (h.id === hostId ? updated : h));
      updateHosts(newHosts);
    },
    [hosts, updateHosts],
  );

  const moveGroup = useCallback(
    (sourcePath: string, targetPath: string) => {
      const movedHosts = hosts.map((h) => {
        if (h.group === sourcePath) {
          const newGroup = targetPath
            ? `${targetPath}/${h.group!.split("/").pop()}`
            : h.group!.split("/").pop()!;
          return { ...h, group: newGroup };
        }
        if (h.group?.startsWith(sourcePath + "/")) {
          const relativePath = h.group.slice(sourcePath.length);
          return { ...h, group: targetPath + relativePath };
        }
        return h;
      });
      updateHosts(movedHosts);
    },
    [hosts, updateHosts],
  );

  // Ungrouped hosts (hosts without a group)
  const ungroupedHosts = useMemo(
    () => hosts.filter((h) => !h.group || h.group.trim() === ""),
    [hosts],
  );

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border/50">
        <Server size={14} className="text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-foreground">
          {t("hostList.title", "主机列表")}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {hosts.length} {t("hostList.hosts", "台主机")}
        </span>
      </div>

      {/* Host tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {groupTree.length > 0 && (
          <HostTreeView
            groupTree={groupTree}
            hosts={hosts}
            sortMode="az"
            expandedPaths={treeExpandedState.expandedPaths}
            onTogglePath={treeExpandedState.togglePath}
            onExpandAll={treeExpandedState.expandAll}
            onCollapseAll={treeExpandedState.collapseAll}
            onConnect={handleConnect}
            onEditHost={handleEdit}
            onDuplicateHost={onDuplicateHost}
            onDeleteHost={onDeleteHost}
            onCopyCredentials={onCopyCredentials}
            onNewHost={onNewHost}
            onNewGroup={onNewGroup}
            onEditGroup={onEditGroup}
            onDeleteGroup={onDeleteGroup}
            moveHostToGroup={moveHostToGroup}
            moveGroup={moveGroup}
            groupConfigs={groupConfigs}
          />
        )}

        {/* Ungrouped hosts section */}
        {ungroupedHosts.length > 0 && groupTree.length === 0 && (
          <div className="px-3 py-2">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {t("hostList.ungrouped", "未分组")}
            </div>
            <div className="space-y-0.5">
              {ungroupedHosts.map((host) => (
                <button
                  key={host.id}
                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent/50 transition-colors flex items-center gap-2"
                  onDoubleClick={() => handleConnect(host)}
                  onClick={() => handleEdit(host)}
                >
                  <Server size={10} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{host.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto truncate">
                    {host.hostname}:{host.port || 22}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {hosts.length === 0 && (
          <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
            {t("hostList.empty", "暂无主机，右键新建")}
          </div>
        )}
      </div>
    </div>
  );
};

export const HostListSidePanel = memo(HostListSidePanelInner);
HostListSidePanel.displayName = "HostListSidePanel";
