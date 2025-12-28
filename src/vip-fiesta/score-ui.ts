import { CONFIG } from './state.ts';

// Team colors for the 8 teams
const TEAM_COLORS: mod.Vector[] = [
    mod.CreateVector(1, 0.2, 0.2), // Team 1: Red
    mod.CreateVector(0.2, 0.4, 1), // Team 2: Blue
    mod.CreateVector(0.2, 1, 0.2), // Team 3: Green
    mod.CreateVector(1, 1, 0.2), // Team 4: Yellow
    mod.CreateVector(0.2, 1, 1), // Team 5: Cyan
    mod.CreateVector(1, 0.2, 1), // Team 6: Magenta
    mod.CreateVector(1, 0.6, 0.2), // Team 7: Orange
    mod.CreateVector(0.6, 0.2, 1), // Team 8: Purple
];

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
        if (totalActiveTeams <= 4) {
            // Single row, center-aligned
            const totalWidth = totalActiveTeams * (WIDGET_WIDTH + WIDGET_SPACING) - WIDGET_SPACING;
            const containerWidth = 640;
            const startX = (containerWidth - totalWidth) / 2;
            return {
                x: startX + displayIndex * (WIDGET_WIDTH + WIDGET_SPACING),
                y: 5,
            };
        } else {
            // Two rows (4 per row)
            const col = displayIndex % 4;
            const row = Math.floor(displayIndex / 4);
            return {
                x: col * (WIDGET_WIDTH + WIDGET_SPACING) + WIDGET_SPACING,
                y: row * ROW_HEIGHT + 5,
            };
        }
    }

    // Calculate container height based on active teams
    private calculateContainerHeight(activeTeamCount: number): number {
        if (activeTeamCount <= 4) {
            return 38; // Single row
        } else {
            return 70; // Two rows
        }
    }

    // Initialize the scoreboard UI for all players
    public initialize(): void {
        if (this.initialized) return;

        // Create main container at top of screen (max size, will be resized dynamically)
        mod.AddUIContainer(
            CONTAINER_NAME,
            mod.CreateVector(0, 10, 0), // Position: top center with small margin
            mod.CreateVector(640, 70, 0), // Size: max size for 8 teams in 2 rows
            mod.UIAnchor.TopCenter,
            mod.GetUIRoot(),
            true, // visible
            4, // padding
            mod.CreateVector(0, 0, 0), // bgColor: black
            0.6, // bgAlpha
            mod.UIBgFill.Blur
        );

        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);

        // Create all 8 team widgets (HIDDEN by default - position set dynamically)
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
    public updateActiveTeams(activeTeamIds: number[]): void {
        if (!this.initialized) return;

        // Hide all team widgets first
        for (let teamId = 1; teamId <= CONFIG.TEAM_COUNT; teamId++) {
            const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamId));
            if (widget) {
                mod.SetUIWidgetVisible(widget, false);
            }
        }

        // Resize container based on active team count
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            const newHeight = this.calculateContainerHeight(activeTeamIds.length);
            mod.SetUIWidgetSize(container, mod.CreateVector(640, newHeight, 0));
        }

        // Show and reposition active team widgets
        activeTeamIds.forEach((teamId, displayIndex) => {
            const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamId));
            if (widget) {
                const pos = this.calculateWidgetPosition(displayIndex, activeTeamIds.length);
                mod.SetUIWidgetPosition(widget, mod.CreateVector(pos.x, pos.y, 0));
                mod.SetUIWidgetVisible(widget, true);
            }
        });

        this.currentActiveTeams = [...activeTeamIds];
    }

    // Update score display for a specific team
    public updateScore(teamId: number, score: number): void {
        if (!this.initialized) return;
        if (!this.currentActiveTeams.includes(teamId)) return;

        const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamId));
        if (widget) {
            mod.SetUITextLabel(widget, mod.Message(mod.stringkeys.vipFiesta.ui.teamScore, teamId, score));
        }
    }

    // Update all scores at once
    public updateAllScores(scores: Map<number, number>): void {
        for (const [teamId, score] of scores) {
            this.updateScore(teamId, score);
        }
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
