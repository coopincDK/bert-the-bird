using UnityEngine;
using System.Collections;

public class RandomAnimationTime : MonoBehaviour {
	Animator anim;
	// Use this for initialization
	void Start () {
		anim = GetComponent<Animator> ();		
	}
	void OnEnable() {
		if (anim != null)
			anim.ForceStateNormalizedTime(UnityEngine.Random.Range(0.0f, 4.0f));
	}
}
