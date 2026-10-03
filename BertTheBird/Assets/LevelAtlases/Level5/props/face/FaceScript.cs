using UnityEngine;
using System.Collections;

public class FaceScript : MonoBehaviour {
	Animator Eye1;
	Animator Eye2;
	Animator Mouth;

	// Use this for initialization
	void Awake () {
		Eye1 = transform.FindChild ("Eye1").GetComponent<Animator> ();
		Eye2 = transform.FindChild ("Eye2").GetComponent<Animator> ();
		Mouth = transform.FindChild ("Mouth").GetComponent<Animator> ();
	}

	void OnEnable() {
		Eye1.ForceStateNormalizedTime(UnityEngine.Random.Range(0.0f, 2.0f));
		Eye2.ForceStateNormalizedTime(UnityEngine.Random.Range(0.0f, 2.0f));
		Mouth.ForceStateNormalizedTime(UnityEngine.Random.Range(0.0f, 2.0f));
	}
}
