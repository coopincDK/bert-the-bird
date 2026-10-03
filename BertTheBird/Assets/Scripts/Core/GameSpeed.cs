using UnityEngine;
using System.Collections;


public class GameSpeed : MonoBehaviour {


	public float Speed = 10f;
	public float Difficulty = 1f;

	//[HideInInspector] public float MaxSpeed = 20f;
	//[HideInInspector] public float SpeedGain = 0.001f;
	[HideInInspector] public float movespeed = 10f;
	[HideInInspector] public AudioSource music;
	//[HideInInspector] public float CurrentSpeed;
	[HideInInspector] public Vector3 userDirection = Vector3.right;

	//on death
	public float musicSlowDownRate = 0.6f;
	public float cameraSlowDownRate = 0.6f;


	//stageControl
	bool EndOfStages = false;
	GameStage defaultGameStage = new GameStage(){Duration = 0f, SpeedMultiplier = 0.4f, DifficultiMultiplier = 1f};
	GameStage[] Stages;
	int CurrentStageIndex = -1;
	int StageCount = 0;
	float StageDuration = 0f;
	float StageDurationPassed = 0f;
	GameStage CurrentStage;
	GameStage PreviousStage;
	GameStage SavedStage;
	GameStage TempStage;

	float CurrentSpeedMultiplier;
	float CurrentDifficultiMultiplier;
	float lerpPosition;
	bool TempStageActive = false;
	bool runningTempStage = false;
	bool stopTempStage = false;

	float tempDuration = 2f;
	float tempDurationPassed = 0f;
	float tempLerpPosition = 0f;
	GameStage tempFrom;
	GameStage tempTo;

	void Awake() {
		CurrentStage = defaultGameStage;
		Application.targetFrameRate = 10000;
	}


	// Update is called once per frame
	void FixedUpdate () {

		if (!Statics.Dead) {
			if (!Statics.PreWarmMode) {
				StageControl();
			}
		}
		else {
				if (Speed > 0) {
					Speed = Mathf.Lerp(Speed, 0.3f, cameraSlowDownRate * Time.deltaTime);
				}
				if (music.pitch > 0) {
					if (Statics.Dying) {
						music.pitch = Mathf.Lerp(music.pitch, 0, musicSlowDownRate * Time.deltaTime);
					}
				}
		}


	}

	void StageControl() {
		if (!TempStageActive && !EndOfStages) {
			if (StageDurationPassed >= StageDuration) {
				if (StageCount > 0 && CurrentStageIndex < StageCount - 1) {
					PreviousStage = CurrentStage;
					CurrentStageIndex++;
					CurrentStage = Stages[CurrentStageIndex];
					StageDurationPassed = 0f;
					StageDuration = CurrentStage.Duration;
				} else {
					EndOfStages = true;
				}
			}
			
			lerpPosition = StageDurationPassed / StageDuration;
			Speed = Mathf.Lerp (PreviousStage.SpeedMultiplier, CurrentStage.SpeedMultiplier, lerpPosition);
			Difficulty = Mathf.Lerp (PreviousStage.DifficultiMultiplier, CurrentStage.DifficultiMultiplier, lerpPosition);
			StageDurationPassed += Time.deltaTime;
		}

		if (TempStageActive) {
			if (!runningTempStage && !stopTempStage) {
				runningTempStage = true;
				tempFrom = SavedStage;
				tempTo = TempStage;
				tempDurationPassed = 0f;
			}

			if (stopTempStage && runningTempStage) {
				runningTempStage = false;
				tempFrom = TempStage;
				tempTo = SavedStage;
				tempDurationPassed = 0f;
			}

			if (tempDurationPassed <= tempDuration) {
				tempLerpPosition = tempDurationPassed / tempDuration;
				Speed = Mathf.Lerp (tempFrom.SpeedMultiplier, tempTo.SpeedMultiplier, tempLerpPosition);
				Difficulty = Mathf.Lerp (tempFrom.DifficultiMultiplier, tempTo.DifficultiMultiplier, tempLerpPosition);
				tempDurationPassed += Time.deltaTime;
			}

			if (!runningTempStage && stopTempStage && tempDurationPassed >= tempDuration) {
				TempStageActive = false;
				stopTempStage = false;
			}
		}
	}

	public void SetNewStages(GameStage[] stages, float startSpeed) {
		EndOfStages = false;
		Speed = startSpeed;
		CurrentStage = defaultGameStage;
		CurrentStage.SpeedMultiplier = startSpeed;
		PreviousStage = CurrentStage;
		Stages = stages;
		StageCount = Stages.Length;
		CurrentStageIndex = -1;
		StageDuration = 0f;
		StageDurationPassed = 0f;
		Difficulty = CurrentStage.DifficultiMultiplier;
		TempStageActive = false;
		runningTempStage = false;
		stopTempStage = false;
	}

	public void SetTempStage(GameStage stage) {
		TempStage = stage;
		SavedStage = new GameStage(){Duration = 2f, SpeedMultiplier = Speed, DifficultiMultiplier = Difficulty};
		TempStageActive = true;
	}

	public void StopTempStage() {
		stopTempStage = true;
	}

}
