import { CONFIG, VIPFiestaState } from './state.ts';

// Generate team colors programmatically for up to CONFIG.TEAM_COUNT teams
function generateTeamColors(): mod.Vector[] {
    const colors: mod.Vector[] = [];
    // Predefined colors for first 8 teams
    const predefinedColors = [
        mod.CreateVector(1, 0.2, 0.2), // Team 1: Red
        mod.CreateVector(0.2, 0.4, 1), // Team 2: Blue
        mod.CreateVector(0.2, 1, 0.2), // Team 3: Green
        mod.CreateVector(1, 1, 0.2), // Team 4: Yellow
        mod.CreateVector(0.2, 1, 1), // Team 5: Cyan
        mod.CreateVector(1, 0.2, 1), // Team 6: Magenta
        mod.CreateVector(1, 0.6, 0.2), // Team 7: Orange
        mod.CreateVector(0.6, 0.2, 1), // Team 8: Purple
    ];

    // Add predefined colors
    colors.push(...predefinedColors);

    // Generate additional colors using HSV-like distribution
    for (let i = 8; i < CONFIG.TEAM_COUNT; i++) {
        const hue = (i * 137.5) % 360; // Golden angle approximation for good distribution
        const saturation = 0.7 + (i % 3) * 0.1; // Vary saturation slightly
        const value = 0.8 + (i % 2) * 0.2; // Vary brightness

        // Simple HSV to RGB conversion (approximate)
        const c = value * saturation;
        const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
        const m = value - c;

        let r = 0, g = 0, b = 0;
        if (hue < 60) { r = c; g = x; b = 0; }
        else if (hue < 120) { r = x; g = c; b = 0; }
        else if (hue < 180) { r = 0; g = c; b = x; }
        else if (hue < 240) { r = 0; g = x; b = c; }
        else if (hue < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        colors.push(mod.CreateVector(r + m, g + m, b + m));
    }

    return colors;
}

const TEAM_COLORS: mod.Vector[] = generateTeamColors();

// Widget names for each team score
function getScoreWidgetName(teamId: number): string {
    return `vipfiesta_score_team_${teamId}`;
}

const CONTAINER_NAME = 'vipfiesta_scoreboard';
const WIDGET_WIDTH = 145;
const WIDGET_HEIGHT = 28;
const WIDGET_SPACING = 10;
const ROW_HEIGHT = 32;

export class VIPFiestaScoreUI {
    private initialized = false;
    private currentActiveTeams: number[] = [];

    // Calculate position for a team widget based on its index in active teams
    private calculateWidgetPosition(displayIndex: number, totalActiveTeams: number): { x: number; y: number } {
        const teamsPerRow = 6; // Show up to 6 teams per row for better fit
        if (totalActiveTeams <= teamsPerRow) {
            // Single row, center-aligned
            const totalWidth = totalActiveTeams * (WIDGET_WIDTH + WIDGET_SPACING) - WIDGET_SPACING;
            const containerWidth = 640;
            const startX = (containerWidth - totalWidth) / 2;
            return {
                x: startX + displayIndex * (WIDGET_WIDTH + WIDGET_SPACING),
                y: 5,
            };
        } else {
            // Multiple rows
            const col = displayIndex % teamsPerRow;
            const row = Math.floor(displayIndex / teamsPerRow);
            return {
                x: col * (WIDGET_WIDTH + WIDGET_SPACING) + WIDGET_SPACING,
                y: row * ROW_HEIGHT + 5,
            };
        }
    }

    // Calculate container height based on active teams
    private calculateContainerHeight(activeTeamCount: number): number {
        const teamsPerRow = 6;
        const rows = Math.ceil(activeTeamCount / teamsPerRow);
        return rows * ROW_HEIGHT + 8; // Add some padding
    }

    // Initialize the scoreboard UI for all players
    public initialize(): void {
        if (this.initialized) return;

        // Create main container at top of screen (max size, will be resized dynamically)
        mod.AddUIContainer(
            CONTAINER_NAME,
            mod.CreateVector(0, 10, 0), // Position: top center with small margin
            mod.CreateVector(640, 70, 0), // Size: initial size, will be resized based on active teams
            mod.UIAnchor.TopCenter,
            mod.GetUIRoot(),
            true, // visible
            4, // padding
            mod.CreateVector(0, 0, 0), // bgColor: black
            0.6, // bgAlpha
            mod.UIBgFill.Blur
        );

        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);

        // Create all team widgets (HIDDEN by default - position set dynamically)
        for (let teamId = 1; teamId <= CONFIG.TEAM_COUNT; teamId++) {
            const teamColor = TEAM_COLORS[teamId - 1] ?? mod.CreateVector(1, 1, 1);

            mod.AddUIText(
                getScoreWidgetName(teamId),
                mod.CreateVector(0, 0, 0), // Position set dynamically in updateActiveTeams
                mod.CreateVector(WIDGET_WIDTH, WIDGET_HEIGHT, 0),
                mod.UIAnchor.TopLeft,
                container,
                false, // HIDDEN by default
                4, // padding
                teamColor, // bgColor: team color
                0.3, // bgAlpha: subtle background
                mod.UIBgFill.Solid,
                mod.Message(mod.stringkeys.vipFiesta.ui.teamScore, teamId, 0),
                18, // textSize
                mod.CreateVector(1, 1, 1), // textColor: white
                1, // textAlpha
                mod.UIAnchor.Center
            );
        }

        this.initialized = true;
    }

    // Update which teams are visible and reposition them
    public updateActiveTeams(state: VIPFiestaState): void {
        if (!this.initialized) return;

        // Get current player and their team
        const currentPlayer = mod.GetPlayerFromObjId(mod.GetLocalPlayerId());
        const currentPlayerTeam = currentPlayer ? mod.GetObjId(mod.GetTeam(currentPlayer)) : null;

        // Sort active teams by score (descending)
        const sortedTeams = state.activeTeamIds
            .map(teamId => ({
                teamId,
                score: state.teamScores.get(teamId) ?? 0
            }))
            .sort((a, b) => b.score - a.score);

        // Select top 5 teams
        const topTeams = sortedTeams.slice(0, 5);

        // Add current player's team if not already in top 5
        const teamsToShow: Array<{teamId: number, rank: number}> = [];
        const teamRanks = new Map<number, number>();

        // Assign ranks to all teams
        sortedTeams.forEach((team, index) => {
            teamRanks.set(team.teamId, index + 1);
        });

        // Add top teams with their ranks
        topTeams.forEach(team => {
            teamsToShow.push({
                teamId: team.teamId,
                rank: teamRanks.get(team.teamId) ?? 1
            });
        });

        // Add current player's team if not in top 5
        if (currentPlayerTeam && !topTeams.some(t => t.teamId === currentPlayerTeam)) {
            const playerTeamRank = teamRanks.get(currentPlayerTeam) ?? 1;
            teamsToShow.push({
                teamId: currentPlayerTeam,
                rank: playerTeamRank
            });
        }

        // Hide all team widgets first
        for (let teamId = 1; teamId <= CONFIG.TEAM_COUNT; teamId++) {
            const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamId));
            if (widget) {
                mod.SetUIWidgetVisible(widget, false);
            }
        }

        // Resize container based on teams to show count
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            const newHeight = this.calculateContainerHeight(teamsToShow.length);
            mod.SetUIWidgetSize(container, mod.CreateVector(640, newHeight, 0));
        }

        // Show and reposition selected team widgets
        teamsToShow.forEach((teamInfo, displayIndex) => {
            const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamInfo.teamId));
            if (widget) {
                const pos = this.calculateWidgetPosition(displayIndex, teamsToShow.length);
                mod.SetUIWidgetPosition(widget, mod.CreateVector(pos.x, pos.y, 0));
                mod.SetUIWidgetVisible(widget, true);

                // Update the text to show rank instead of team ID
                const score = state.teamScores.get(teamInfo.teamId) ?? 0;
                mod.SetUITextLabel(widget, mod.Message(mod.stringkeys.vipFiesta.ui.teamScore, teamInfo.rank, score));
            }
        });

        this.currentActiveTeams = teamsToShow.map(t => t.teamId);
    }

    // Update score display for a specific team
    public updateScore(teamId: number, score: number, state: VIPFiestaState): void {
        if (!this.initialized) return;

        // Refresh the entire UI to recalculate ranks and visibility
        this.updateActiveTeams(state);
    }

    // Update all scores at once
    public updateAllScores(scores: Map<number, number>, state: VIPFiestaState): void {
        // Refresh the entire UI to recalculate ranks and visibility
        this.updateActiveTeams(state);
    }

    // Highlight winning team (optional visual feedback)
    public highlightTeam(teamId: number): void {
        if (!this.initialized) return;
        if (!this.currentActiveTeams.includes(teamId)) return;

        const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamId));
        if (widget) {
            // Set brighter background to highlight the winning team
            const teamColor = TEAM_COLORS[teamId - 1] ?? mod.CreateVector(1, 1, 1);
            mod.SetUIWidgetBgColor(widget, teamColor);
            mod.SetUIWidgetBgAlpha(widget, 0.8);
        }
    }

    // Show the scoreboard
    public show(): void {
        if (!this.initialized) return;
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            mod.SetUIWidgetVisible(container, true);
        }
    }

    // Hide the scoreboard
    public hide(): void {
        if (!this.initialized) return;
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            mod.SetUIWidgetVisible(container, false);
        }
    }

    // Cleanup - remove all UI widgets
    public destroy(): void {
        if (!this.initialized) return;

        // Delete team score widgets
        for (let teamId = 1; teamId <= CONFIG.TEAM_COUNT; teamId++) {
            const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamId));
            if (widget) {
                mod.DeleteUIWidget(widget);
            }
        }

        // Delete container
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            mod.DeleteUIWidget(container);
        }

        this.initialized = false;
    }
}
