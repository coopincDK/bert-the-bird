using UnityEngine;
using System.Collections;

public class SnakeTrigger : MonoBehaviour {
	Animator SnakeAnim;

	void Start() {
		SnakeAnim = transform.parent.GetComponent<Animator>();
	}

	// Use this for initialization
	void OnTriggerEnter2D(Collider2D other) {
		SnakeAnim.SetTrigger ("Jump");
	}
}
