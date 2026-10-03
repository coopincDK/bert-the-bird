using UnityEngine;
using System.Collections;

public class ShieldVisualEffect : MonoBehaviour {
	float lerpA = 0;
	float speed = 7f;

	void OnEnable () {
		transform.localScale = Vector3.zero;
		lerpA = 0;
		GetComponent<AudioSource>().Play ();
	}
	void Update () {
		transform.rotation = Quaternion.identity;
		if (lerpA < 1) {
			lerpA += speed * Time.deltaTime;
			transform.localScale = Vector3.Lerp(Vector3.zero, new Vector3(1,1,1), lerpA);
		}
	}
}