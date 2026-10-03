using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;
using CodeStage.AntiCheat.Detectors;

public static class Cheat {
	public static bool AssholeDetected = false;
}
public class AntiAsshole : MonoBehaviour {
	void Start () {
		ObscuredPrefs.lockToDevice = ObscuredPrefs.DeviceLockLevel.Strict;
		SpeedHackDetector.StartDetection(TerminateLowLifeSpeed, 1f, 5);
		InjectionDetector.StartDetection (TerminateLowLifeInjection);
		ObscuredPrefs.onAlterationDetected = TerminateLowLifeAlteration;
		ObscuredPrefs.onPossibleForeignSavesDetected = TerminateLowLifeSaveDataCheater;
		ObscuredInt.onCheatingDetected = TerminateLowLifeInt;
		ObscuredFloat.onCheatingDetected = TerminateLowLifeFloat;
	}

	private void TerminateLowLifeSpeed(){
		Terminate ("Speedhack");
	}

	private void TerminateLowLifeInjection(){
		Terminate ("DLL injection");	
	}

	private void TerminateLowLifeAlteration() {
		Terminate ("Prefs altering");
	}

	private void TerminateLowLifeSaveDataCheater() {
		Terminate ("Savedata doesn't belong to device");	
	}

	private void TerminateLowLifeInt() {
		Terminate ("Altering Int 'prefs trap'");
	}

	private void TerminateLowLifeFloat() {
		Terminate ("Altering Float 'prefs trap'");
	}


	private void Terminate(string message)
	{
		Cheat.AssholeDetected = true;
		Time.timeScale = 0;
		SyncData.LogCheat(message); 
		PlayerPrefs.DeleteAll ();
		Application.Quit ();
	}
}
