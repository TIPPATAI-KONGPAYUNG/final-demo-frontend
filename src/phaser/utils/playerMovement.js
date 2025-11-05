import { playWalk, playIdle } from '../../anims/PlayerAnims.js';

// Core movement function with collision detection
export async function moveForwardWithCollisionDetection(player) {
    const currentNodeId = player.currentNodeIndex;
    
    const targetNodeId = player.scene.pathSystem.getTargetNodeInDirection(
        currentNodeId, 
        player.directionIndex
    );

    if (targetNodeId === null) {
        return false;
    }

    const currentNode = player.scene.pathSystem.getNodeById(currentNodeId);
    const targetNode = player.scene.pathSystem.getNodeById(targetNodeId);
    
    if (!currentNode || !targetNode) {
        return false;
    }

    const moveResult = await player.scene.pathSystem.movePlayerWithCollisionDetection(
        player.scene, 
        currentNode, 
        targetNode
    );
    
    if (moveResult.hitObstacle) {
        player.scene.events.emit('pitCollision', {
            collided: true,
            obstacle: { description: "Pit encountered during movement" },
            type: "pit",
            collisionType: "realtime"
        });
        return false;
    }

    if (moveResult.success) {
        player.currentNodeIndex = targetNodeId;
        
        if (player.scene.pathSystem.isGoalNode(targetNodeId)) {
            player.scene.events.emit('goalReached');
        }
        
        return true;
    }

    return false;
}

// Node-based movement function
export async function moveToNode(player, nodeId) {
    if (nodeId === undefined || nodeId === null || isNaN(nodeId)) {
        return false;
    }

    const levelData = player.scene.levelData;
    if (!levelData) {
        return false;
    }

    const targetNode = levelData.nodes.find(node => node.id === nodeId);
    if (!targetNode) {
        return false;
    }

    const worldX = targetNode.x;
    const worldY = targetNode.y;

    await moveToPosition(player, worldX, worldY);
    player.currentNodeIndex = nodeId;

    if (levelData.goalNodeId === nodeId) {
        const { getCurrentGameState, setCurrentGameState } = await import('../../utils/gameUtils');
        setCurrentGameState({ goalReached: true });
        player.scene.events.emit('goalReached');
    }

    return true;
}

// Basic position movement with animation
export async function moveToPosition(player, x, y) {
    playWalk(player);

    const trailColor = 0x00ff00;
    const trail = player.scene.add.circle(player.x, player.y, 12, trailColor, 0.3);
    trail.setDepth(5);
    player.scene.tweens.add({
        targets: trail,
        alpha: 0,
        scaleX: 2.5,
        scaleY: 2.5,
        duration: 500,
        onComplete: () => trail.destroy()
    });

    await new Promise(resolve => {
        player.scene.tweens.add({
            targets: player,
            x,
            y,
            duration: 500,
            ease: 'Power2.easeInOut',
            onComplete: () => {
                playIdle(player);
                resolve();
            }
        });
    });
}

// Core direction-checking functions
export function getTargetNodeIndex(player, direction) {
    const currentNodeId = player.currentNodeIndex;
    return player.scene.pathSystem.getTargetNodeInDirection(currentNodeId, player.directionIndex);
}

export function getPossibleDirections(player) {
    const currentNodeId = player.currentNodeIndex;
    return player.scene.pathSystem.getPossibleDirections(currentNodeId);
}

export function canMoveForward(player) {
    const currentNodeId = player.currentNodeIndex;
    return player.scene.pathSystem.canMoveInDirection(currentNodeId, player.directionIndex);
}

export function getCurrentDirectionSymbol(player) {
    return player.scene.pathSystem.getDirectionSymbol(player.directionIndex);
}
