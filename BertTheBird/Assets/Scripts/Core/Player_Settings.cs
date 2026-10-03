using UnityEngine;
using System.Collections;

public class Player_Settings : MonoBehaviour {
	// Use this for initialization
	void Awake () {
		#if !UNITY_EDITOR && !UNITY_STANDALONE
		Application.targetFrameRate = 60;
		QualitySettings.vSyncCount = 0;
		#endif

	}

	void Start () {
		Screen.sleepTimeout = SleepTimeout.NeverSleep;
	}
}
