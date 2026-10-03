using UnityEngine;
using System.Collections;

public class PowerUpMovement : MonoBehaviour {
	

	// Update is called once per frame
	void Update () {
		transform.localPosition += Vector3.left * 3f * Time.deltaTime;
	}
}
